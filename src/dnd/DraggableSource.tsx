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
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id,
        data,
        disabled,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} className={className} {...listeners} {...attributes}>
            {children}
        </div>
    );
};
