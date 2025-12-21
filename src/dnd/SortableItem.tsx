import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
    id: string | number;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children, disabled, className, style }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    const combinedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        ...style,
    };

    return (
        <div ref={setNodeRef} style={combinedStyle} className={className} {...attributes} {...listeners}>
            {children}
        </div>
    );
};
