import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface DraggableSourceProps {
    id: string;
    data?: any;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}

export const DraggableSource: React.FC<DraggableSourceProps> = ({ id, data, children, disabled, className }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id,
        data,
        disabled,
    });

    const style = {
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={className} {...listeners} {...attributes}>
            {children}
        </div>
    );
};
