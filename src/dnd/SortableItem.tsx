import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDndContext, useDroppable } from '@dnd-kit/core';

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

// Sortable + Droppable item component for reordering within chests
// AND receiving drops from external sources (sidebar, other chests)
export const SortableItem: React.FC<SortableItemProps> = ({
    id,
    children,
    disabled,
    className,
    style
}) => {
    const { active } = useDndContext();

    // Sortable for reordering items within the same chest
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        disabled: !!disabled
    });

    // Droppable for receiving items from external sources (sidebar, other chests)
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `item-drop-${id}`,
        data: { itemId: id },
    });

    // Combine refs
    const setNodeRef = (node: HTMLElement | null) => {
        setSortableRef(node);
        setDroppableRef(node);
    };

    // Check if we're being dragged over by an external item
    const isExternalDragOver = isOver && active && active.id !== id;

    const combinedStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: disabled ? 'default' : 'grab',
        // Visual indicator when external item is hovering
        outline: isExternalDragOver ? '2px solid rgba(59, 130, 246, 0.5)' : undefined,
        outlineOffset: isExternalDragOver ? '2px' : undefined,
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

export default SortableItem;
