// Chest utility functions - single source of truth for chest business logic

import { Item, Chest } from './types';

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
