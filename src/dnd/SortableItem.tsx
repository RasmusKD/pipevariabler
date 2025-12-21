import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDndContext } from '@dnd-kit/core';

interface SortableItemProps {
    id: string | number;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children, disabled, className, style }) => {
    const { active } = useDndContext();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    // Only hide if this specific sortable item is actually being dragged (not just matching ID from source)
    // The `isDragging` from useSortable is true only when THIS sortable node is the active drag source
    const combinedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        ...style,
    };

    return (
        <div ref={setNodeRef} style={combinedStyle} className={className} {...attributes} {...listeners}>
            {children}
        </div>
    );
};
