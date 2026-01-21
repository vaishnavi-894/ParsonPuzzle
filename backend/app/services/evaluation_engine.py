from typing import List, Dict, Tuple
from app.models.puzzle_block import PuzzleBlock


class EvaluationEngine:
    """Core evaluation engine for Parsons Puzzle attempts"""
    
    @staticmethod
    def validate_submission_format(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> Tuple[bool, str]:
        """
        Validate that the submission format is correct
        Returns: (is_valid, error_message)
        """
        block_ids = {block.block_id for block in puzzle_blocks}
        
        # Check if all submitted IDs are valid
        for block_id in submitted_order:
            if block_id not in block_ids:
                return False, f"Invalid block_id: {block_id}"
        
        # Check if all blocks are included (no duplicates, no missing)
        if len(submitted_order) != len(set(submitted_order)):
            return False, "Duplicate blocks in submission"
        
        if len(submitted_order) != len(puzzle_blocks):
            return False, "Incorrect number of blocks"
        
        return True, ""
    
    @staticmethod
    def compute_exact_match_score(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> bool:
        """
        Check if the submitted order exactly matches the correct order
        Returns: True if exact match, False otherwise
        """
        # Create mapping of block_id to correct_position
        correct_order = sorted(puzzle_blocks, key=lambda b: b.correct_position)
        correct_block_ids = [block.block_id for block in correct_order]
        
        return submitted_order == correct_block_ids
    
    @staticmethod
    def compute_partial_score(
        submitted_order: List[str],
        puzzle_blocks: List[PuzzleBlock]
    ) -> float:
        """
        Compute partial score based on how many blocks are in correct positions
        Returns: Score between 0.0 and 1.0
        """
        # Create mapping of block_id to correct_position
        block_positions = {block.block_id: block.correct_position for block in puzzle_blocks}
        
        correct_count = 0
        for i, block_id in enumerate(submitted_order):
            if block_positions[block_id] == i:
                correct_count += 1
        
        return correct_count / len(submitted_order) if submitted_order else 0.0
    
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
        # Create mapping of block_id to block
        block_map = {block.block_id: block for block in puzzle_blocks}
        
        # Get correct order
        correct_order = sorted(puzzle_blocks, key=lambda b: b.correct_position)
        correct_block_ids = [block.block_id for block in correct_order]
        
        feedback = {
            "is_correct": is_correct,
            "mismatches": [],
            "hints": []
        }
        
        if is_correct:
            feedback["message"] = "Perfect! Your solution is correct."
            return feedback
        
        # Find mismatches
        for i, block_id in enumerate(submitted_order):
            correct_pos = block_map[block_id].correct_position
            if correct_pos != i:
                feedback["mismatches"].append({
                    "block_id": block_id,
                    "block_text": block_map[block_id].text,
                    "submitted_position": i,
                    "correct_position": correct_pos
                })
        
        # Generate hints
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
