"""
Code Parser Service — Hierarchical Scope-Aware Block Generation

Parses pseudocode into line-level blocks tagged with scope metadata:
  - function_name      : top-level function this block belongs to
  - scope_id           : unique ID if this block IS a scope opener (func def / loop header)
  - parent_scope_id    : scope_id of the immediately enclosing scope
  - is_scope_header    : True if this line opens a scope
  - scope_type         : "function" | "for_loop" | "while_loop"

Function detection strategy
---------------------------
Rather than enumerating return-type keywords (which breaks on complex types like
`vector<int>`, `unordered_map<K,V>`, `pair<int,int>`, etc.) we use structural
detection:

  A line is a function definition when ALL of the following hold:
    1. The line ends with `{` or `:`
    2. The first real word on the line is NOT a control/flow keyword
    3. There is at least one pattern of  identifier(  anywhere on the line
    4. That identifier is not a blacklisted keyword

Bracket handling
----------------
Lines whose stripped content is ONLY structural brackets/braces (e.g. `}`, `{`,
`};`, `})`) produce no Parsons block — they are structural noise in C-style code.
Lines that contain real words alongside brackets (e.g. `} else {`) are kept.
"""

import re
from typing import List, Dict, Any, Optional
from uuid import uuid4


# ─── Pattern helpers ────────────────────────────────────────────────────────

# Explicit function-keyword patterns (Python / generic pseudocode)
# These take priority over the generic C-style detector.
_EXPLICIT_FUNC_PATTERNS = [
    re.compile(r'^\s*algorithm\s+(\w+)\s*\(',        re.IGNORECASE),
    re.compile(r'^\s*def\s+(\w+)\s*\(',             re.IGNORECASE),
    re.compile(r'^\s*function\s+(\w+)\s*\(',         re.IGNORECASE),
    re.compile(r'^\s*(?:procedure|sub|method)\s+(\w+)\s*\(', re.IGNORECASE),
    re.compile(r'^\s*(\w+)\s+function\s*:',          re.IGNORECASE),
    re.compile(r'^\s*function\s+(\w+)\s*:',          re.IGNORECASE),
]

# A scope-opening line ends with { or :
_ENDS_WITH_SCOPE = re.compile(r'[{:]\s*$')

# Match the FIRST identifier immediately before a '('
_ID_BEFORE_PAREN = re.compile(r'\b([A-Za-z_]\w*)\s*\(')

# Loop starters  (checked separately from functions)
_FOR_PATTERN   = re.compile(r'^\s*for\b',   re.IGNORECASE)
_WHILE_PATTERN = re.compile(r'^\s*while\b', re.IGNORECASE)

# Comment patterns
_COMMENT_PATTERN = re.compile(r'^\s*(?:#|//|/\*|\*)')

# Lines that are ONLY brackets / braces / semicolons — silently skipped.
# E.g.  `}`, `{`, `};`, `})`  → no Parsons block.
# Lines like `} else {` or `return 0;` contain real words → kept.
_PURE_BRACKET = re.compile(r'^[\s{}\(\)\[\];,]*$')

# Words that can NEVER be function names.
# NOTE: 'for'/'while' are already handled by _match_loop; they appear here
# too so the generic function detector never mis-fires on them.
_FUNC_BLACKLIST = frozenset([
    # control flow
    'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case',
    'catch', 'try', 'finally', 'return', 'break', 'continue', 'goto',
    # OOP / modifiers
    'class', 'struct', 'enum', 'namespace', 'template', 'typename',
    'using', 'typedef', 'public', 'private', 'protected', 'virtual',
    'static', 'inline', 'extern', 'const', 'override', 'final',
    # memory
    'new', 'delete', 'throw', 'sizeof', 'typeof', 'decltype',
    'static_cast', 'dynamic_cast', 'reinterpret_cast', 'const_cast',
    # common I/O helpers that look like functions
    'cout', 'cin', 'printf', 'scanf', 'print', 'println',
    'assert', 'exit', 'abort',
    # pseudocode keywords (handled by explicit patterns)
    'algorithm', 'def', 'function', 'procedure', 'sub', 'method',
])


# ─── Helper functions ────────────────────────────────────────────────────────

def _get_indent(line: str) -> int:
    """Return the number of leading spaces (tabs count as 4)."""
    count = 0
    for ch in line:
        if ch == ' ':
            count += 1
        elif ch == '\t':
            count += 4
        else:
            break
    return count


def _is_comment(line: str) -> bool:
    return bool(_COMMENT_PATTERN.match(line))


def _is_pure_bracket(line: str) -> bool:
    """True for lines whose content is ONLY structural brackets/braces.
    E.g.  `}`, `{`, `};`, `})`  → True  (skip as Parsons block).
    E.g.  `} else {`, `return 0;`  → False  (keep as Parsons block).
    """
    stripped = line.strip()
    return bool(stripped) and bool(_PURE_BRACKET.fullmatch(stripped))


def _match_function(line: str):
    """Return (True, func_name) if line is a function definition, else (False, None).

    Strategy:
    1. Try explicit keyword patterns (def / function / procedure …).
    2. Generic structural detection for C/C++/Java-style code:
       - line ends with { or :
       - first word on line is NOT a blacklisted keyword
       - there is an identifier immediately before the first '('
       - that identifier is not blacklisted
    """
    # ── Explicit keyword patterns (Python / pseudocode) ────────────
    for pat in _EXPLICIT_FUNC_PATTERNS:
        m = pat.match(line)
        if m:
            return True, m.group(1)

    # ── Generic structural detection (C / C++ / Java-like) ─────────
    stripped = line.strip()

    # Must end with { or :
    if not _ENDS_WITH_SCOPE.search(stripped):
        return False, None

    # First real word must not be a keyword
    fw = re.match(r'^\s*(\w+)', line)
    if not fw or fw.group(1).lower() in _FUNC_BLACKLIST:
        return False, None

    # Find the first identifier immediately before (
    for m in _ID_BEFORE_PAREN.finditer(stripped):
        name = m.group(1)
        if name.lower() not in _FUNC_BLACKLIST:
            return True, name

    return False, None


def _match_loop(line: str):
    """Return scope_type string if line is a loop header, else None."""
    if _FOR_PATTERN.match(line):
        return 'for_loop'
    if _WHILE_PATTERN.match(line):
        return 'while_loop'
    return None


# ─── Main parser ─────────────────────────────────────────────────────────────

class CodeParser:
    """Parses pseudocode/code and emits line-level blocks with scope metadata."""

    @staticmethod
    def parse_code(code_text: str) -> List[Dict[str, Any]]:
        """
        Parse code into a flat list of block dicts, each tagged with scope info.
        Uses indentation-based scope tracking.
        Pure bracket/brace-only lines are skipped entirely.
        """
        lines = code_text.split('\n')
        blocks: List[Dict[str, Any]] = []

        # Scope stack entries:
        #   { 'id': str, 'type': "function"|"for_loop"|"while_loop",
        #     'name': str, 'indent': int, 'function_name': str }
        scope_stack: List[Dict] = []

        def current_function_name() -> Optional[str]:
            for s in reversed(scope_stack):
                if s['type'] == 'function':
                    return s['name']
            return None

        def current_parent_id() -> Optional[str]:
            return scope_stack[-1]['id'] if scope_stack else None

        for line_no, raw_line in enumerate(lines, start=1):
            stripped = raw_line.strip()

            # ── Skip blank lines ──────────────────────────────────
            if not stripped:
                continue

            # ── Skip pure-bracket lines (}, {, };, etc.) ─────────
            # Still pop scopes based on their indentation level.
            if _is_pure_bracket(raw_line):
                indent = _get_indent(raw_line)
                while scope_stack and indent <= scope_stack[-1]['indent']:
                    scope_stack.pop()
                continue

            indent = _get_indent(raw_line)

            # Pop scopes that we've returned out of
            while scope_stack and indent <= scope_stack[-1]['indent']:
                scope_stack.pop()

            # Detect line type
            is_func, func_name_detected = _match_function(raw_line)
            loop_type = _match_loop(raw_line)
            comment   = _is_comment(raw_line)

            # Assign scope metadata
            block_id     = str(uuid4())
            parent_id    = current_parent_id()
            func_name    = current_function_name()
            is_scope_hdr = False
            scope_type   = None
            scope_id_val = None

            if is_func:
                is_scope_hdr = True
                scope_type   = 'function'
                scope_id_val = block_id
                func_name    = func_name_detected

            elif loop_type:
                is_scope_hdr = True
                scope_type   = loop_type
                scope_id_val = block_id

            block = {
                'text':              raw_line,
                'correct_position':  len(blocks),
                'indentation_level': indent,
                'is_comment':        comment,
                'line_number':       line_no,
                'function_name':     func_name,
                'scope_id':          scope_id_val,
                'parent_scope_id':   parent_id,
                'is_scope_header':   is_scope_hdr,
                'scope_type':        scope_type,
            }
            blocks.append(block)

            if is_scope_hdr:
                scope_stack.append({
                    'id':            block_id,
                    'type':          scope_type,
                    'name':          func_name_detected if is_func else f'loop_{len(blocks)}',
                    'indent':        indent,
                    'function_name': func_name,
                })

        return blocks

    @staticmethod
    def generate_blocks_from_code(code_text: str, puzzle_id: str) -> List[Dict[str, Any]]:
        """Generate puzzle blocks from code text ready for DB insertion."""
        from datetime import datetime

        parsed_blocks = CodeParser.parse_code(code_text)
        db_blocks = []
        for b in parsed_blocks:
            db_blocks.append({
                'block_id':          str(uuid4()),
                'puzzle_id':         puzzle_id,
                'text':              b['text'],
                'correct_position':  b['correct_position'],
                'block_type':        'NORMAL',
                'explanation':       None,
                'indentation_level': b['indentation_level'],
                'is_comment':        b['is_comment'],
                'line_number':       b['line_number'],
                'function_name':     b.get('function_name'),
                'scope_id':          b.get('scope_id'),
                'parent_scope_id':   b.get('parent_scope_id'),
                'is_scope_header':   b.get('is_scope_header', False),
                'scope_type':        b.get('scope_type'),
                'created_at':        datetime.utcnow(),
            })
        return db_blocks

    @staticmethod
    def extract_function_names(blocks: List[Dict[str, Any]]) -> List[str]:
        """Return distinct function names in the order they first appear."""
        seen: set = set()
        names: List[str] = []
        for b in blocks:
            fn = b.get('function_name')
            if fn and fn not in seen:
                seen.add(fn)
                names.append(fn)
        return names
