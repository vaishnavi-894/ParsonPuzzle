import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { puzzleAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Save, Eye } from 'lucide-react';
import './Instructor.css';

export default function PuzzleBuilderPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [puzzle, setPuzzle] = useState({
        title: '',
        description: '',
        difficulty: 'MEDIUM',
        tags: []
    });

    const [blocks, setBlocks] = useState([
        { text: '', correct_position: 0 }
    ]);

    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handlePuzzleChange = (e) => {
        setPuzzle({
            ...puzzle,
            [e.target.name]: e.target.value
        });
    };

    const handleBlockChange = (index, value) => {
        const newBlocks = [...blocks];
        newBlocks[index].text = value;
        newBlocks[index].correct_position = index;
        setBlocks(newBlocks);
    };

    const addBlock = () => {
        setBlocks([...blocks, { text: '', correct_position: blocks.length }]);
    };

    const removeBlock = (index) => {
        const newBlocks = blocks.filter((_, i) => i !== index);
        // Update positions
        newBlocks.forEach((block, i) => {
            block.correct_position = i;
        });
        setBlocks(newBlocks);
    };

    const moveBlock = (index, direction) => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= blocks.length) return;

        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

        // Update positions
        newBlocks.forEach((block, i) => {
            block.correct_position = i;
        });

        setBlocks(newBlocks);
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

        if (blocks.length < 2) {
            setError('Please add at least 2 code blocks');
            return;
        }

        if (blocks.some(b => !b.text.trim())) {
            setError('All code blocks must have content');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Create puzzle
            const puzzleResponse = await puzzleAPI.create(puzzle);
            const puzzleId = puzzleResponse.data.puzzle_id;

            // Add blocks
            await puzzleAPI.addBlocks(puzzleId, blocks);

            // Navigate to puzzles list
            navigate('/instructor/puzzles');
        } catch (err) {
            setError('Failed to save puzzle');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Create New Puzzle</h1>
                <p className="text-secondary">Build a Parsons puzzle for your students</p>
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
                        <select
                            id="difficulty"
                            name="difficulty"
                            className="input"
                            value={puzzle.difficulty}
                            onChange={handlePuzzleChange}
                        >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                        </select>
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
                        <h3>Code Blocks (in correct order)</h3>
                        <button onClick={addBlock} className="btn btn-primary">
                            <Plus size={18} />
                            Add Block
                        </button>
                    </div>

                    <div className="blocks-builder">
                        {blocks.map((block, index) => (
                            <div key={index} className="block-builder-item">
                                <div className="block-number">{index + 1}</div>
                                <textarea
                                    className="input block-input"
                                    placeholder="Enter pseudocode line..."
                                    value={block.text}
                                    onChange={(e) => handleBlockChange(index, e.target.value)}
                                    rows="2"
                                />
                                <div className="block-actions">
                                    <button
                                        onClick={() => moveBlock(index, 'up')}
                                        className="btn btn-secondary"
                                        disabled={index === 0}
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => moveBlock(index, 'down')}
                                        className="btn btn-secondary"
                                        disabled={index === blocks.length - 1}
                                    >
                                        ↓
                                    </button>
                                    <button
                                        onClick={() => removeBlock(index)}
                                        className="btn btn-error"
                                        disabled={blocks.length <= 1}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="builder-actions">
                    <button onClick={() => navigate('/instructor/puzzles')} className="btn btn-secondary btn-lg">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary btn-lg" disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Puzzle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
