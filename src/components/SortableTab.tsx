import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { TAB_SWITCH_DELAY } from '../constants';

interface SortableTabProps {
    tabId: number;
    isActive: boolean;
    isEditing: boolean;
    onSwitchTab: (tabId: number) => void;
    children: (showHighlight: boolean) => React.ReactNode;
}

// Sortable + Droppable tab wrapper
const SortableTab: React.FC<SortableTabProps> = ({ tabId, isActive, isEditing, onSwitchTab, children }) => {
    const { active } = useDndContext();

    // Sortable for reordering tabs
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `tab-${tabId}`,
        disabled: isEditing, // Don't allow drag when editing
    });

    // Droppable for receiving items/chests
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `tab-drop-${tabId}`,
        data: { tabId },
    });

    // Combine refs
    const setNodeRef = (node: HTMLElement | null) => {
        setSortableRef(node);
        setDroppableRef(node);
    };

    const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);
    const { over } = useDndContext();

    // Check if we are over this tab (either the sortable ID or the droppable ID)
    const isOverTab = over && (over.id === `tab-${tabId}` || over.id === `tab-drop-${tabId}`);

    // Switch tab after hovering for TAB_SWITCH_DELAY ms (when dragging items)
    React.useEffect(() => {
        // Only switch tab if dragging an item/chest (not another tab)
        const isDraggingTab = active?.id?.toString().startsWith('tab-');

        if (isOverTab && active && !isActive && !isEditing && !isDraggingTab) {
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
    }, [isOverTab, active, isActive, isEditing, tabId, onSwitchTab]);

    const showHighlight = !!isOverTab && !!active && !isEditing && !active?.id?.toString().startsWith('tab-');

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        >
            {children(showHighlight)}
        </div>
    );
};

export default SortableTab;
