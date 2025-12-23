import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableProps {
    id: string | number;
    children: React.ReactNode;
    data?: any;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

// Unified draggable component for both sidebar items and chest items
// Handles drag with fade effect, no transform (DragOverlay handles visual)
export const Draggable: React.FC<DraggableProps> = ({
    id,
    children,
    data,
    disabled,
    className,
    style
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        isDragging
    } = useDraggable({
        id,
        data,
        disabled: !!disabled
    });

    // Fade source element while dragging (DragOverlay handles visual)
    const combinedStyle: React.CSSProperties = {
        opacity: isDragging ? 0.4 : 1,
        ...style,
    };

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            className={className}
            data-item-id={id}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
};

// Re-export with old names for backwards compatibility
export const DraggableItem = Draggable;
export const DraggableSource = Draggable;
