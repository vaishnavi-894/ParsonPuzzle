import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { puzzleAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Save, Code2, Eye } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ThemeSelect from '../common/ThemeSelect';
import './Instructor.css';

export default function PuzzleBuilderPage() {
    const difficultyOptions = [
        { value: 'EASY', label: 'Easy' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HARD', label: 'Hard' },
    ];

    const navigate = useNavigate();
    const { user } = useAuth();

    const [puzzle, setPuzzle] = useState({
        title: '',
        description: '',
        difficulty: 'MEDIUM',
        tags: [],
        code_text: ''
    });

    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const handlePuzzleChange = (e) => {
        setPuzzle({
            ...puzzle,
            [e.target.name]: e.target.value
        });
    };

    const handleCodeChange = (value) => {
        setPuzzle({
            ...puzzle,
            code_text: value || ''
        });
    };

    const addTag = () => {
        if (tagInput && !puzzle.tags.includes(tagInput)) {
            setPuzzle({
                ...puzzle,
                tags: [...puzzle.tags, tagInput]
            });
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setPuzzle({
            ...puzzle,
            tags: puzzle.tags.filter(t => t !== tag)
        });
    };

    const handleSave = async () => {
        // Validation
        if (!puzzle.title || !puzzle.description) {
            setError('Please fill in title and description');
            return;
        }

        if (!puzzle.code_text || puzzle.code_text.trim().length === 0) {
            setError('Please paste some code to create the puzzle');
            return;
        }

        const codeLines = puzzle.code_text.trim().split('\n');
        if (codeLines.length < 2) {
            setError('Please provide at least 2 lines of code');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Create puzzle - backend will auto-generate blocks from code_text
            await puzzleAPI.create(puzzle);

            // Navigate to puzzles list
            navigate('/instructor/puzzles');
        } catch (err) {
            console.error('Error creating puzzle:', err);
            setError(err.response?.data?.detail || 'Failed to save puzzle');
        } finally {
            setSaving(false);
        }
    };

    // ── Regex helpers mirroring the backend parser ──────────────────
    // Explicit pseudo/Python patterns
    const EXPLICIT_FUNC_PATTERNS = [
        /^\s*algorithm\s+(\w+)\s*\(/i,
        /^\s*def\s+(\w+)\s*\(/i,
        /^\s*function\s+(\w+)\s*\(/i,
        /^\s*(?:procedure|sub|method)\s+(\w+)\s*\(/i,
        /^\s*(\w+)\s+function\s*:/i,
        /^\s*function\s+(\w+)\s*:/i,
    ];

    // Words that can NEVER be function names
    const FUNC_BLACKLIST = new Set([
        'if','else','elif','for','while','do','switch','case',
        'catch','try','finally','return','break','continue','goto',
        'class','struct','enum','namespace','template','typename',
        'using','typedef','public','private','protected','virtual',
        'static','inline','extern','const','override','final',
        'new','delete','throw','sizeof','typeof','decltype',
        'static_cast','dynamic_cast','reinterpret_cast','const_cast',
        'cout','cin','printf','scanf','print','println',
        'assert','exit','abort',
        'algorithm','def','function','procedure','sub','method',
    ]);

    const matchFunction = (line) => {
        // Try explicit keyword patterns first
        for (const pat of EXPLICIT_FUNC_PATTERNS) {
            const m = line.match(pat);
            if (m) return m[1];
        }
        // Generic structural detection: line ends with { or :
        if (!/[{:]\s*$/.test(line.trimEnd())) return null;
        // First word must not be a keyword
        const fw = line.match(/^\s*(\w+)/);
        if (!fw || FUNC_BLACKLIST.has(fw[1].toLowerCase())) return null;
        // Find first identifier before ( that isn't blacklisted
        const idParen = /\b([A-Za-z_]\w*)\s*\(/g;
        let m;
        while ((m = idParen.exec(line)) !== null) {
            if (!FUNC_BLACKLIST.has(m[1].toLowerCase())) return m[1];
        }
        return null;
    };

    const matchLoop = (line) => {
        if (/^\s*for\b/i.test(line)) return 'for_loop';
        if (/^\s*while\b/i.test(line)) return 'while_loop';
        return null;
    };

    const getIndent = (line) => {
        let c = 0;
        for (const ch of line) {
            if (ch === ' ') c++;
            else if (ch === '\t') c += 4;
            else break;
        }
        return c;
    };

    const isComment = (line) => /^\s*(?:#|\/\/|\/\*)/.test(line);

    // ── Parse into scope-aware flat blocks ──────────────────────────
    const getCodePreview = () => {
        if (!puzzle.code_text) return [];

        const rawLines = puzzle.code_text.split('\n');
        const blocks = [];
        // scope stack: { type:'function'|'loop', name:str, indent:int, funcName:str }
        const stack = [];

        const currentFn = () => {
            for (let i = stack.length - 1; i >= 0; i--)
                if (stack[i].type === 'function') return stack[i].name;
            return null;
        };

        rawLines.forEach((raw, idx) => {
            const stripped = raw.trim();
            if (!stripped) return;

            const indent = getIndent(raw);
            while (stack.length && indent <= stack[stack.length - 1].indent)
                stack.pop();

            // Skip lines that are ONLY brackets/braces — same logic as backend parser.
            // E.g.  `}`, `{`, `};`  are skipped; `} else {` is kept.
            if (/^[\s{}\(\)\[\];,]*$/.test(stripped)) return;

            const fnName  = matchFunction(raw);
            const loopTyp = matchLoop(raw);
            const comment = isComment(raw);

            const block = {
                text: raw,
                number: blocks.length + 1,
                indentation: indent,
                isComment: comment,
                function_name: fnName ?? currentFn(),
                is_scope_header: !!(fnName || loopTyp),
                scope_type: fnName ? 'function' : loopTyp,
            };

            blocks.push(block);

            if (fnName || loopTyp) {
                stack.push({
                    type: fnName ? 'function' : 'loop',
                    name: fnName ?? `loop_${blocks.length}`,
                    indent,
                    funcName: fnName ?? currentFn(),
                });
            }
        });


        return blocks;
    };

    // Group preview blocks by function_name
    const getPreviewGrouped = () => {
        const blocks = getCodePreview();
        const groups = [];  // [{ fnName, blocks: [] }]
        const fnMap = {};
        blocks.forEach(b => {
            const key = b.function_name || '(global)';
            if (!fnMap[key]) {
                fnMap[key] = { fnName: key, blocks: [] };
                groups.push(fnMap[key]);
            }
            fnMap[key].blocks.push(b);
        });
        return groups;
    };

    // Monaco Editor options
    const editorOptions = {
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'off',
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        bracketPairColorization: { enabled: true },
        guides: {
            indentation: true,
            bracketPairs: true
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Create New Puzzle</h1>
                <p className="text-secondary">Paste your code and we'll auto-generate scrambled blocks</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="puzzle-builder-container">
                <div className="builder-section card">
                    <h3>Puzzle Details</h3>

                    <div className="form-group">
                        <label htmlFor="title">Title</label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            className="input"
                            placeholder="e.g., Binary Search Implementation"
                            value={puzzle.title}
                            onChange={handlePuzzleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description / Problem Statement</label>
                        <textarea
                            id="description"
                            name="description"
                            className="input"
                            rows="4"
                            placeholder="Describe the problem students need to solve..."
                            value={puzzle.description}
                            onChange={handlePuzzleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="difficulty">Difficulty</label>
                        <ThemeSelect
                            id="difficulty"
                            name="difficulty"
                            value={puzzle.difficulty}
                            onChange={handlePuzzleChange}
                            options={difficultyOptions}
                        />
                    </div>

                    <div className="form-group">
                        <label>Tags</label>
                        <div className="tag-input-container">
                            <input
                                type="text"
                                className="input"
                                placeholder="Add a tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                            />
                            <button onClick={addTag} className="btn btn-secondary">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="tags-list">
                            {puzzle.tags.map((tag, index) => (
                                <span key={index} className="badge badge-primary">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="tag-remove">×</button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="builder-section card">
                    <div className="section-header">
                        <h3><Code2 size={20} /> Code Editor</h3>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="btn btn-secondary"
                        >
                            <Eye size={18} />
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                    </div>

                    <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                        Paste your code below. Each line will become a scrambled block.
                        Features: auto-bracket completion, syntax highlighting, and IntelliSense.
                    </p>

                    <div className="monaco-editor-container">
                        <Editor
                            height="400px"
                            defaultLanguage="python"
                            theme="vs-dark"
                            value={puzzle.code_text}
                            onChange={handleCodeChange}
                            options={editorOptions}
                            loading={<div className="editor-loading">Loading editor...</div>}
                        />
                    </div>

                    {showPreview && puzzle.code_text && (
                        <div className="code-preview-section">
                            <h4>Preview — grouped by function (as students will see it):</h4>
                            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                                {getCodePreview().length} line-level blocks across {getPreviewGrouped().length} function(s)
                            </p>
                            {getPreviewGrouped().map((group, gi) => (
                                <div key={gi} style={{ marginBottom: '1.5rem' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        marginBottom: '0.5rem', paddingBottom: '0.4rem',
                                        borderBottom: '1px solid rgba(139,92,246,0.2)'
                                    }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-500)', fontFamily: 'Courier New, monospace' }}>
                                            ƒ {group.fnName}()
                                        </span>
                                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                                            {group.blocks.length} blocks
                                        </span>
                                    </div>
                                    <div className="preview-blocks">
                                        {group.blocks.map((block, index) => (
                                            <div key={index} className="preview-block">
                                                <span className="preview-number">{block.number}</span>
                                                <div style={{ flex: 1 }}>
                                                    <SyntaxHighlighter
                                                        language="python"
                                                        style={vscDarkPlus}
                                                        customStyle={{
                                                            margin: 0,
                                                            padding: '0.6rem',
                                                            fontSize: '0.85rem',
                                                            background: block.isComment
                                                                ? 'rgba(34,197,94,0.1)'
                                                                : block.is_scope_header
                                                                    ? 'rgba(139,92,246,0.08)'
                                                                    : 'transparent',
                                                            borderRadius: '6px',
                                                            borderLeft: block.is_scope_header
                                                                ? '2px solid rgba(139,92,246,0.5)'
                                                                : 'none'
                                                        }}
                                                    >
                                                        {block.text || ' '}
                                                    </SyntaxHighlighter>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    {block.isComment && <span className="badge badge-success">Comment</span>}
                                                    {block.scope_type === 'function' && <span className="badge badge-primary">Function</span>}
                                                    {block.scope_type === 'for_loop' && <span className="badge badge-secondary">for loop ↓</span>}
                                                    {block.scope_type === 'while_loop' && <span className="badge badge-secondary">while loop ↓</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="builder-actions">
                    <button onClick={() => navigate('/instructor/puzzles')} className="btn btn-secondary btn-lg">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary btn-lg" disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Creating Puzzle...' : 'Create Puzzle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
