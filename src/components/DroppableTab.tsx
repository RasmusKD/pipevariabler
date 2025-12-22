import React from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';

interface DroppableTabProps {
    tabId: number;
    isActive: boolean;
    isEditing: boolean;
    onSwitchTab: (tabId: number) => void;
    children: (showHighlight: boolean) => React.ReactNode;
}

// Droppable tab wrapper - switches to tab when dragging over it
const DroppableTab: React.FC<DroppableTabProps> = ({ tabId, isActive, isEditing, onSwitchTab, children }) => {
    const { active } = useDndContext();
    const { setNodeRef, isOver } = useDroppable({
        id: `tab-drop-${tabId}`,
        data: { tabId },
    });

    const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

    // Switch tab after hovering for 500ms
    React.useEffect(() => {
        if (isOver && active && !isActive && !isEditing) {
            hoverTimeout.current = setTimeout(() => {
                onSwitchTab(tabId);
            }, 500);
        }
        return () => {
            if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current);
                hoverTimeout.current = null;
            }
        };
    }, [isOver, active, isActive, isEditing, tabId, onSwitchTab]);

    const showHighlight = isOver && !!active && !isEditing;

    return (
        <div ref={setNodeRef}>
            {children(showHighlight)}
        </div>
    );
};

export default DroppableTab;
