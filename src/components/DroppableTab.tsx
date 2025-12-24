import React from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { TAB_SWITCH_DELAY } from '../constants';

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

    // Switch tab after hovering for TAB_SWITCH_DELAY ms
    React.useEffect(() => {
        if (isOver && active && !isActive && !isEditing) {
            hoverTimeout.current = setTimeout(() => {
                onSwitchTab(tabId);
            }, TAB_SWITCH_DELAY);
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
