import itemsData from './data.json';
import { Item } from './types';

// Build item data map once for lookups
const itemDataMap = new Map<string, { image: string; variable: string }>();
itemsData.items.forEach((item: { item: string; image: string; variable: string }) => {
    itemDataMap.set(item.item, { image: item.image, variable: item.variable });
});

/**
 * Process raw items from profile/import, ensuring they have all required fields
 */
export const processItems = (items: Partial<Item>[]): Item[] => items.map((i) => {
    const dataItem = itemDataMap.get(i.item || '');
    return {
        item: i.item || '',
        image: i.image || dataItem?.image || `${i.item}.png`,
        variable: i.variable || dataItem?.variable || '',
        uid: i.uid || Math.random().toString(36).substr(2, 9)
    };
});

/**
 * Get item metadata from the data map
 */
export const getItemData = (itemName: string) => itemDataMap.get(itemName);

/**
 * Get all items from data.json
 */
export const getAllItems = (): Item[] => itemsData.items.map((item: { item: string; image: string; variable: string }) => ({
    uid: item.item, // Use item name as uid for sidebar items
    item: item.item,
    image: item.image,
    variable: item.variable
}));
