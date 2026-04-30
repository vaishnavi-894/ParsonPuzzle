from typing import List, Dict, Tuple
from app.models.puzzle_block import PuzzleBlock


class EvaluationEngine:
    """Core evaluation engine for Parsons Puzzle attempts"""

    @staticmethod
    def _arrangeable_blocks(puzzle_blocks: List[PuzzleBlock]) -> List[PuzzleBlock]:
        """Blocks the student actually arranges in the UI.

        Function headers are navigation containers, not draggable answer blocks.
        Loop headers still count because students place them in the solution.
        """
        return [
            block for block in puzzle_blocks
            if not (block.is_scope_header and block.scope_type == "function")
        ]
    
    @staticmethod
    def validate_submission_format(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> Tuple[bool, str]:
        """
        Validate that the submission format is correct
        Returns: (is_valid, error_message)
        """
        arrangeable_blocks = EvaluationEngine._arrangeable_blocks(puzzle_blocks)
        block_ids = {block.block_id for block in arrangeable_blocks}
        
        # Check if all submitted IDs are valid
        for block_id in submitted_order:
            if block_id not in block_ids:
                return False, f"Invalid block_id: {block_id}"
        
        # Check if all blocks are included (no duplicates, no missing)
        if len(submitted_order) != len(set(submitted_order)):
            return False, "Duplicate blocks in submission"
        
        return True, ""

    @staticmethod
    def _scope_key(block: PuzzleBlock) -> str:
        return block.parent_scope_id or block.function_name or "__global__"

    @staticmethod
    def _group_by_scope(block_ids: List[str], block_map: Dict[str, PuzzleBlock]) -> Dict[str, List[str]]:
        grouped: Dict[str, List[str]] = {}
        for block_id in block_ids:
            block = block_map[block_id]
            key = EvaluationEngine._scope_key(block)
            grouped.setdefault(key, []).append(block_id)
        return grouped
    
    @staticmethod
    def compute_exact_match_score(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> bool:
        """
        Check if the submitted order exactly matches the correct order
        Returns: True if exact match, False otherwise
        """
        arrangeable_blocks = EvaluationEngine._arrangeable_blocks(puzzle_blocks)
        if len(submitted_order) != len(arrangeable_blocks):
            return False

        block_map = {block.block_id: block for block in arrangeable_blocks}
        correct_by_scope = EvaluationEngine._group_by_scope(
            [block.block_id for block in sorted(arrangeable_blocks, key=lambda b: b.correct_position)],
            block_map
        )
        submitted_by_scope = EvaluationEngine._group_by_scope(submitted_order, block_map)

        return submitted_by_scope == correct_by_scope
    
    @staticmethod
    def compute_partial_score(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> float:
        """
        Compute partial score based on how many blocks are in correct positions
        Returns: Score between 0.0 and 1.0
        """
        arrangeable_blocks = EvaluationEngine._arrangeable_blocks(puzzle_blocks)
        if not arrangeable_blocks:
            return 0.0

        block_map = {block.block_id: block for block in arrangeable_blocks}
        correct_by_scope = EvaluationEngine._group_by_scope(
            [block.block_id for block in sorted(arrangeable_blocks, key=lambda b: b.correct_position)],
            block_map
        )
        submitted_by_scope = EvaluationEngine._group_by_scope(submitted_order, block_map)

        correct_count = 0
        for scope, submitted_ids in submitted_by_scope.items():
            correct_ids = correct_by_scope.get(scope, [])
            for index, block_id in enumerate(submitted_ids):
                if index < len(correct_ids) and correct_ids[index] == block_id:
                    correct_count += 1

        return correct_count / len(arrangeable_blocks)
    
    @staticmethod
    def generate_feedback(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock],
        is_correct: bool
    ) -> Dict:
        """
        Generate detailed feedback for the student
        Returns: Dictionary with feedback information
        """
        arrangeable_blocks = EvaluationEngine._arrangeable_blocks(puzzle_blocks)

        # Create mapping of block_id to block
        block_map = {block.block_id: block for block in arrangeable_blocks}
        
        # Get correct order per function/loop scope.
        correct_order = sorted(arrangeable_blocks, key=lambda b: b.correct_position)
        correct_by_scope = EvaluationEngine._group_by_scope(
            [block.block_id for block in correct_order],
            block_map
        )
        submitted_by_scope = EvaluationEngine._group_by_scope(submitted_order, block_map)
        
        feedback = {
            "is_correct": is_correct,
            "mismatches": [],
            "hints": [],
            "total_blocks": len(arrangeable_blocks),
            "submitted_count": len(submitted_order),
            "correct_count": 0,
            "incorrect_count": 0,
            "missing_count": max(0, len(arrangeable_blocks) - len(submitted_order)),
            "position_results": [],
        }
        
        if is_correct:
            feedback["correct_count"] = feedback["total_blocks"]
            feedback["incorrect_count"] = 0
            feedback["message"] = "Perfect! Your solution is correct."
            return feedback
        
        # Find mismatches inside each function/loop scope. Missing blocks are
        # counted separately, so correct work in one function still earns credit.
        for scope, submitted_ids in submitted_by_scope.items():
            correct_ids = correct_by_scope.get(scope, [])
            for i, block_id in enumerate(submitted_ids):
                is_correct_position = i < len(correct_ids) and correct_ids[i] == block_id
                feedback["position_results"].append({
                    "block_id": block_id,
                    "is_correct": is_correct_position,
                    "submitted_position": i,
                    "scope": scope,
                })
                if is_correct_position:
                    continue

                correct_pos = correct_ids.index(block_id) if block_id in correct_ids else None
                feedback["mismatches"].append({
                    "block_id": block_id,
                    "block_text": block_map[block_id].text,
                    "submitted_position": i,
                    "correct_position": correct_pos
                })

        feedback["incorrect_count"] = len(feedback["mismatches"])
        feedback["correct_count"] = sum(1 for item in feedback["position_results"] if item["is_correct"])

        # Generate hints
        if feedback["missing_count"] > 0:
            feedback["hints"].append(
                f"Arrange all blocks to finish the puzzle. {feedback['missing_count']} blocks are still missing."
            )

        if len(feedback["mismatches"]) > 0:
            feedback["hints"].append(f"You have {len(feedback['mismatches'])} blocks in incorrect positions.")
            
            # Find first mismatch
            first_mismatch = min(feedback["mismatches"], key=lambda x: x["submitted_position"])
            feedback["hints"].append(
                f"Check the block at position {first_mismatch['submitted_position'] + 1}: '{first_mismatch['block_text']}'"
            )
        
        return feedback
    
    @staticmethod
    def enforce_attempt_rules(
        current_attempt_number: int,
        max_attempts: int,
        assignment_start: str,
        assignment_end: str,
        current_time: str
    ) -> Tuple[bool, str]:
        """
        Check if the attempt is allowed based on rules
        Returns: (is_allowed, error_message)
        """
        from datetime import datetime
        
        # Check attempt limit
        if current_attempt_number > max_attempts:
            return False, f"Maximum attempts ({max_attempts}) exceeded"
        
        # Check time window
        current_dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        start_dt = datetime.fromisoformat(assignment_start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(assignment_end.replace('Z', '+00:00'))
        
        if current_dt < start_dt:
            return False, "Assignment has not started yet"
        
        if current_dt > end_dt:
            return False, "Assignment deadline has passed"
        
        return True, ""
    
    @staticmethod
    def evaluate_attempt(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> Dict:
        """
        Main evaluation method that combines all checks
        Returns: Dictionary with evaluation results
        """
        # Validate format
        is_valid, error = EvaluationEngine.validate_submission_format(submitted_order, puzzle_blocks)
        if not is_valid:
            return {
                "is_correct": False,
                "score": 0.0,
                "feedback": {"error": error}
            }
        
        # Compute scores
        is_correct = EvaluationEngine.compute_exact_match_score(submitted_order, puzzle_blocks)
        partial_score = EvaluationEngine.compute_partial_score(submitted_order, puzzle_blocks)
        
        # Generate feedback
        feedback = EvaluationEngine.generate_feedback(submitted_order, puzzle_blocks, is_correct)
        
        return {
            "is_correct": is_correct,
            "score": 1.0 if is_correct else partial_score,
            "feedback": feedback
        }
