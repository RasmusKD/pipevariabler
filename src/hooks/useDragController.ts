import { useState, useCallback, useRef, useMemo } from 'react';
import {
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Item, Tab, Chest } from '../types';
import {
    findItem,
    gatherSelectedItems,
    canAddItemToChest,
    cloneItemWithNewUid
} from '../chestUtils';
import { DRAG_ACTIVATION_DISTANCE } from '../constants';

interface UseDragControllerProps {
    items: Item[];
    setItems: React.Dispatch<React.SetStateAction<Item[]>>;
    tabs: Tab[];
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    activeTab: Tab | undefined;
    activeTabId: number;
    setActiveTabId: React.Dispatch<React.SetStateAction<number>>;
    updateChests: (newChests: Chest[]) => void;
    selectedItems: Set<string>;
    setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
    setUndoStack: React.Dispatch<React.SetStateAction<Tab[][]>>;
    setRedoStack: React.Dispatch<React.SetStateAction<Tab[][]>>;
    getNextChestId: () => number;
}

export const useDragController = ({
    items,
    setItems,
    tabs,
    setTabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    updateChests,
    selectedItems,
    setSelectedItems,
    setUndoStack,
    setRedoStack,
    getNextChestId
}: UseDragControllerProps) => {
    const [activeId, setActiveId] = useState<string | number | null>(null);
    const [activeItem, setActiveItem] = useState<Item | Chest | null>(null);

    // Track if we're dragging an item (string id) vs chest (number id)
    // This ref persists through the render cycle so the DragOverlay animation can check it
    const dragSourceIsItemRef = useRef<boolean>(false);

    const chests = useMemo(() => activeTab?.chests || [], [activeTab?.chests]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: DRAG_ACTIVATION_DISTANCE,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id);
        setActiveItem(findItem(event.active.id, items, chests) as any);
        // Track if this is an item drag (string id) for animation purposes
        dragSourceIsItemRef.current = typeof event.active.id === 'string';
    }, [items, chests]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const item = findItem(active.id, items, chests);
        if (!item || !('uid' in item)) return; // Don't drag chests into chests

        const overIdStr = String(overId);

        // Check if dragging over a tab
        if (overIdStr.startsWith('tab-drop-')) {
            const tabId = over.data.current?.tabId;
            if (tabId && tabId !== activeTabId) {
                // Tab switching is handled by DroppableTab component via timeout
            }
        }
    }, [items, chests, activeTabId]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            setActiveItem(null);
            return;
        }

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);
        const isTabDrop = overIdStr.startsWith('tab-drop-');

        // Handle Tab-to-Tab reordering
        if (activeIdStr.startsWith('tab-') && overIdStr.startsWith('tab-') && !isTabDrop) {
            const activeTabIdNum = parseInt(activeIdStr.replace('tab-', ''), 10);
            const overTabIdNum = parseInt(overIdStr.replace('tab-', ''), 10);

            if (activeTabIdNum !== overTabIdNum) {
                const oldIndex = tabs.findIndex(t => t.id === activeTabIdNum);
                const newIndex = tabs.findIndex(t => t.id === overTabIdNum);

                if (oldIndex !== -1 && newIndex !== -1) {
                    setTabs(arrayMove(tabs, oldIndex, newIndex));
                }
            }

            setActiveId(null);
            setActiveItem(null);
            return;
        }

        // Handle Chest Dragging
        if (typeof active.id === 'number') {
            const activeChestId = active.id;

            // Find source tab
            const sourceTab = tabs.find(t => t.chests.some(c => c.id === activeChestId));
            if (!sourceTab) return;

            // Determine target tab
            let targetTabId = activeTabId;
            if (isTabDrop) {
                targetTabId = parseInt(overIdStr.replace('tab-drop-', ''), 10);
            }

            // If same tab and dropping on another chest -> Reorder
            if (sourceTab.id === targetTabId && typeof over.id === 'number' && active.id !== over.id) {
                const oldIndex = chests.findIndex((c) => c.id === active.id);
                const newIndex = chests.findIndex((c) => c.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    updateChests(arrayMove(chests, oldIndex, newIndex));
                }
            }
            // If dragging to different tab (or currently active tab but chest is from another one)
            else if (sourceTab.id !== targetTabId) {
                setUndoStack(prev => [...prev, tabs]);
                setRedoStack([]);

                const chestToMove = sourceTab.chests.find(c => c.id === activeChestId)!;

                const newTabs = tabs.map(t => {
                    if (t.id === sourceTab.id) {
                        return { ...t, chests: t.chests.filter(c => c.id !== activeChestId) };
                    }
                    if (t.id === targetTabId) {
                        // Calculate target index if dropping on a specific chest
                        let insertIndex = t.chests.length;
                        if (over && typeof over.id === 'number') {
                            const overChestIndex = t.chests.findIndex(c => c.id === over.id);
                            if (overChestIndex !== -1) {
                                insertIndex = overChestIndex;
                            }
                        }

                        const newChests = [...t.chests];
                        newChests.splice(insertIndex, 0, chestToMove);
                        return { ...t, chests: newChests };
                    }
                    return t;
                });

                setTabs(newTabs);
                setActiveTabId(targetTabId);
            }

            setActiveId(null);
            setActiveItem(null);
            return;
        }

        // Unified handling: gather all items to process in selection order
        const unifiedItems = gatherSelectedItems(activeIdStr, items, tabs, selectedItems);

        // Handle dropping on "Add Chest" drop zone OR Tab Drop (Create chest in tab)
        if (over.id === 'add-chest-drop-zone' || isTabDrop) {
            if (unifiedItems.length > 0) {
                setUndoStack(prev => [...prev, tabs]);
                setRedoStack([]);
                const newChestId = getNextChestId();
                const targetTabIdForNewChest = isTabDrop
                    ? parseInt(overIdStr.replace('tab-drop-', ''), 10)
                    : activeTabId;

                // Use the FIRST selected item for naming
                const firstUnified = unifiedItems[0];
                const firstItem = firstUnified.item;
                const itemName = firstItem.item.replace(/_/g, ' ');

                const newItems: Item[] = [];
                const seenVariables = new Set<string>();

                for (const uItem of unifiedItems) {
                    if (seenVariables.has(uItem.item.variable)) continue;
                    seenVariables.add(uItem.item.variable);

                    if (uItem.type === 'sidebar') {
                        newItems.push(cloneItemWithNewUid(uItem.item));
                    } else {
                        newItems.push(uItem.item);
                    }
                }

                const newChest: Chest = {
                    id: newChestId,
                    label: itemName,
                    items: newItems,
                    icon: firstItem.item,
                    checked: false
                };

                const sourceUidsToRemove = new Set(
                    unifiedItems
                        .filter(u => u.type === 'chest' && newItems.some(ni => ni.uid === u.item.uid))
                        .map(u => u.item.uid)
                );

                const newTabs = tabs.map(tab => ({
                    ...tab,
                    chests: tab.chests.map(chest => ({
                        ...chest,
                        items: chest.items.filter(i => !sourceUidsToRemove.has(i.uid))
                    })).concat(tab.id === targetTabIdForNewChest ? [newChest] : [])
                }));

                setTabs(newTabs);
                if (isTabDrop) {
                    setActiveTabId(targetTabIdForNewChest);
                }

                if (selectedItems.size > 0) {
                    setSelectedItems(new Set());
                }
            }
            setActiveId(null);
            setActiveItem(null);
            return;
        }

        // Determine target chest
        let targetChestId: number | null = null;
        let targetIndex: number | null = null;

        if (over.data.current?.chestId) {
            // Dropped on items list inside chest
            targetChestId = over.data.current.chestId;
            targetIndex = chests.find(c => c.id === targetChestId)?.items.length || 0;
        } else if (overIdStr.startsWith('item-drop-')) {
            // Dropped on a specific item (external drop from sidebar/other chest)
            const targetItemId = overIdStr.replace('item-drop-', '');
            for (const chest of chests) {
                const index = chest.items.findIndex(i => i.uid === targetItemId);
                if (index !== -1) {
                    targetChestId = chest.id;
                    targetIndex = index; // Insert at this position
                    break;
                }
            }
        } else {
            // Dropped on chest itself or an item (internal sort)
            // Check if dropped on a chest
            const targetChest = chests.find(c => c.id === over.id);
            if (targetChest) {
                targetChestId = targetChest.id;
                targetIndex = targetChest.items.length;
            } else {
                // Check if dropped on an item
                for (const chest of chests) {
                    const index = chest.items.findIndex(i => i.uid === overIdStr);
                    if (index !== -1) {
                        targetChestId = chest.id;
                        targetIndex = index; // Insert before the item
                        break;
                    }
                }
            }
        }

        // If target found
        if (targetChestId !== null) {
            setUndoStack(prev => [...prev, tabs]);
            setRedoStack([]);

            const unifiedItems = gatherSelectedItems(activeIdStr, items, tabs, selectedItems);

            // Handle single chest item reorder (same chest)
            if (unifiedItems.length === 1 && unifiedItems[0].type === 'chest' &&
                unifiedItems[0].sourceChestId === targetChestId && typeof targetIndex === 'number') {
                const sourceInfo = unifiedItems[0];
                const chest = chests.find(c => c.id === sourceInfo.sourceChestId)!;
                const sourceIndex = chest.items.findIndex(i => i.uid === sourceInfo.item.uid);

                const newItems = arrayMove(chest.items, sourceIndex, targetIndex);
                updateChests(chests.map(c => c.id === sourceInfo.sourceChestId ? { ...c, items: newItems } : c));
                setSelectedItems(new Set());
                setActiveId(null);
                setActiveItem(null);
                return;
            }

            // General Move Logic
            const targetChest = chests.find(c => c.id === targetChestId)!;
            const validItemsToAdd: Item[] = [];

            let tempTargetItems = [...targetChest.items];
            const sourceUidsToRemove = new Set<string>();

            for (const uItem of unifiedItems) {
                if (uItem.type === 'chest' && uItem.sourceChestId === targetChestId) {
                    tempTargetItems = tempTargetItems.filter(i => i.uid !== uItem.item.uid);
                }

                const itemToAdd = uItem.type === 'sidebar'
                    ? cloneItemWithNewUid(uItem.item)
                    : uItem.item;

                // If it's a move (from chest), we want to remove it from source REGARDLESS of whether we add it to target.
                // (Unless target is same as source, which is handled in reorder block above or handled by 'tempTargetItems' filtering).

                if (uItem.type === 'chest') {
                    sourceUidsToRemove.add(uItem.item.uid);
                }

                if (canAddItemToChest({ ...targetChest, items: tempTargetItems }, itemToAdd)) {
                    validItemsToAdd.push(itemToAdd);
                    tempTargetItems.push(itemToAdd);
                }
            }

            const newTabs = tabs.map(tab => ({
                ...tab,
                chests: tab.chests.map(chest => {
                    let newItems = chest.items.filter(i => !sourceUidsToRemove.has(i.uid));

                    if (chest.id === targetChestId) {
                        if (typeof targetIndex === 'number') {
                            const idx = Math.min(targetIndex, newItems.length);
                            newItems.splice(idx, 0, ...validItemsToAdd);
                        } else {
                            newItems.push(...validItemsToAdd);
                        }
                    }
                    return { ...chest, items: newItems };
                })
            }));

            setTabs(newTabs);
            setSelectedItems(new Set());
        }

        setActiveId(null);
        setActiveItem(null);
    }, [items, chests, tabs, activeTabId, setActiveTabId, updateChests, selectedItems, getNextChestId, setTabs, setSelectedItems, setUndoStack, setRedoStack]);

    // We need to handle selection. 
    // If we click a selected item (without Ctrl), we DON'T want to clear others immediately on PointerDown, 
    // because we might be starting a drag of the whole group.
    // However, if it's just a click (MouseUp), we DO want to clear others.
    // But dnd-kit uses PointerDown.
    // Solution: If item is selected and no modifiers, do NOTHING on PointerDown (let selection stick).
    // The onClick handler in the component (or a separate logic) would be needed for the "Clear others on simple click" behavior.
    // OR: We can clear others in `handleDragStart` if we realize we dragged an item that wasn't in the selection? No.

    // Revised Strategy:
    // 1. On PointerDown:
    //    - If Ctrl/Meta: Toggle.
    //    - If Not Selected: Select ONLY this (clear others).
    //    - If Already Selected: Do NOTHING (keep group for potential drag).
    // 2. On Click (which fires if NO drag occurred):
    //    - If Not Ctrl/Meta AND it was already selected: NOW clear others.

    // Since `handleItemSelect` is called on PointerDown currently... we need to adapt it 
    // OR invoke it differently from the component.
    // For now, let's update it to support a `isClick` flag or similar? 
    // Or just change the logic here and assume component handles the rest.

    const handleItemSelect = useCallback((uid: string, ctrlKey: boolean, isClick: boolean = false) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (ctrlKey) {
                if (isClick) return newSet; // modifying on click with ctrl is redundant/handled on down? 
                // Actually typical OS: Ctrl click toggles on Down.
                if (newSet.has(uid)) newSet.delete(uid);
                else newSet.add(uid);
            } else {
                // No modifier
                if (!newSet.has(uid)) {
                    // Not selected? Select it immediately (and clear others)
                    newSet.clear();
                    newSet.add(uid);
                } else {
                    // Already selected.
                    if (isClick) {
                        // If this is a dedicated CLICK (mouse up, no drag), then we clear others
                        newSet.clear();
                        newSet.add(uid);
                    }
                    // On PointerDown, we do NOTHING to preserve the group for dragging
                }
            }
            return newSet;
        });
    }, [setSelectedItems]);

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return {
        sensors,
        activeId,
        activeItem,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleItemSelect,
        dropAnimation,
        dragSourceIsItemRef
    };
};
