// Chest utility functions - single source of truth for chest business logic

import { Item, Chest, Tab } from './types';

export const CMD_PREFIX = '/signedit 3 ' as const;
export const CMD_LIMIT = 256;

/**
 * Check if a chest already contains an item (by variable)
 * Rule: Each chest can only have one of each item type
 */
export const chestHasItem = (chest: Chest, item: Item): boolean => {
    return chest.items.some(i => i.variable === item.variable);
};

/**
 * Check if an item can be added to a chest
 * Rule: No duplicates allowed in the same chest
 */
export const canAddItemToChest = (chest: Chest, item: Item): boolean => {
    return !chestHasItem(chest, item);
};

/**
 * Add an item to a chest at a specific index (or end if null)
 * Returns the new items array, or null if item already exists
 */
export const addItemToChest = (
    chest: Chest,
    item: Item,
    index: number | null = null
): Item[] | null => {
    if (!canAddItemToChest(chest, item)) {
        return null; // Item already exists
    }

    const newItems = [...chest.items];
    if (index !== null && index >= 0) {
        newItems.splice(index, 0, item);
    } else {
        newItems.push(item);
    }
    return newItems;
};

/**
 * Generate a new unique ID for an item
 */
export const generateItemUid = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

/**
 * Create a copy of an item with a new UID (for adding to chests)
 */
export const cloneItemWithNewUid = (item: Item): Item => {
    return { ...item, uid: generateItemUid() };
};

/**
 * Build the command string for a chest
 */
export const buildCommand = (items: Item[]) => {
    if (items.length === 0) return '';
    return `${CMD_PREFIX}${items.map((i) => i.variable).join(',')}`;
};

/**
 * Find an item or chest by ID in the given collections
 */
export const findItem = (id: string | number, items: Item[], chests: Chest[]) => {
    // Check source items
    const sourceItem = items.find(i => i.uid === id);
    if (sourceItem) return sourceItem;
    // Check chest items
    for (const chest of chests) {
        const chestItem = chest.items.find(i => i.uid === id);
        if (chestItem) return chestItem;
    }
    // Check chests
    if (typeof id === 'number') {
        const chest = chests.find(c => c.id === id);
        if (chest) return chest;
    }
    return null;
};

/**
 * Gather all selected items from sidebar and chests
 */
export type UnifiedItem =
    | { type: 'sidebar'; item: Item }
    | { type: 'chest'; item: Item; sourceChestId: number; sourceTabId: number };

export const gatherSelectedItems = (
    activeIdStr: string,
    items: Item[],
    tabs: Tab[], // Changed from chests to tabs for global search
    selectedItems: Set<string>
): UnifiedItem[] => {
    const hasMultipleSelected = selectedItems.has(activeIdStr) && selectedItems.size > 1;
    const unifiedItems: UnifiedItem[] = [];

    const processUid = (uid: string) => {
        // Check sidebar first
        const sidebarItem = items.find(i => i.uid === uid);
        if (sidebarItem) {
            unifiedItems.push({ type: 'sidebar', item: sidebarItem });
            return;
        }

        // Check all tabs/chests
        for (const tab of tabs) {
            for (const chest of tab.chests) {
                const chestItem = chest.items.find(i => i.uid === uid);
                if (chestItem) {
                    unifiedItems.push({ type: 'chest', item: chestItem, sourceChestId: chest.id, sourceTabId: tab.id });
                    return; // Stop searching once found
                }
            }
        }
    };

    if (hasMultipleSelected) {
        // Iterate in selection order
        for (const uid of Array.from(selectedItems)) {
            processUid(uid);
        }
    } else {
        processUid(activeIdStr);
    }

    return unifiedItems;
};
