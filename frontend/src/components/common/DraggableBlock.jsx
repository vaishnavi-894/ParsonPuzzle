import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import './DraggableBlock.css';

export default function DraggableBlock({ id, text, index }) {
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
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`draggable-block ${isDragging ? 'dragging' : ''}`}
            {...attributes}
        >
            <div className="block-handle" {...listeners}>
                <GripVertical size={20} />
            </div>
            <div className="block-number">{index + 1}</div>
            <div className="block-content">
                <code>{text}</code>
            </div>
        </div>
    );
}
