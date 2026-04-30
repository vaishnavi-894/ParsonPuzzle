import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import './DraggableBlock.css';

/**
 * variant:
 *   "editor"  – shows line number, full-width, green left border accent
 *   "bank"    – compact, no number, muted style
 *   "overlay" – ghost shown under cursor during drag (no sortable)
 * fontSize – controlled font size in px (from the slider)
 */
export default function DraggableBlock({ id, text, index, variant = 'bank', fontSize = 13 }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const isEditor = variant === 'editor';
    const isOverlay = variant === 'overlay';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`draggable-block ${variant}-variant ${isDragging ? 'dragging' : ''}`}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
        >
            <div className="block-handle">
                <GripVertical size={16} />
            </div>

            {isEditor && (
                <div className="line-number">{index + 1}</div>
            )}

            <div className="block-content">
                <code style={{ fontSize: `${fontSize}px` }}>{text}</code>
            </div>
        </div>
    );
}
