import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableItemProps {
    id: string | number;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

// Items in chests are only DRAGGABLE, not droppable
// This means they can be picked up and moved, but don't register as drop targets
// Drops are handled by the chest drop zone (chest-drop-{id}) only
// The actual visual drag is handled by DragOverlay in App.tsx (shows just the icon)
export const DraggableItem: React.FC<DraggableItemProps> = ({ id, children, disabled, className, style }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        isDragging
    } = useDraggable({
        id,
        disabled: !!disabled
    });

    // Don't apply transform - let DragOverlay handle the visual drag
    // Just fade the source element while dragging
    const combinedStyle: React.CSSProperties = {
        opacity: isDragging ? 0.4 : 1,
        ...style,
    };

    return (
        <div ref={setNodeRef} style={combinedStyle} className={className} {...attributes} {...listeners}>
            {children}
        </div>
    );
};
