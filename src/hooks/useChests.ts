import { useCallback } from 'react';
import { Tab, Chest, Item } from '../types';

interface UseChestsProps {
    chests: Chest[];
    tabs: Tab[];
    updateChests: (newChests: Chest[]) => void;
    getNextChestId: () => number;
    setUndoStack: React.Dispatch<React.SetStateAction<Tab[][]>>;
    setRedoStack: React.Dispatch<React.SetStateAction<Tab[][]>>;
    setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setChestToDelete: React.Dispatch<React.SetStateAction<number | null>>;
}

interface UseChestsReturn {
    addChest: () => void;
    handleDeleteChest: (id: number) => void;
    confirmDeleteChest: (id: number) => void;
    updateChestLabel: (id: number, label: string) => void;
    updateChestIcon: (id: number, icon: string) => void;
    removeItemFromChest: (chestId: number, item: Item) => void;
}

/**
 * Custom hook for chest CRUD operations
 * Centralizes all chest manipulation logic
 */
export const useChests = ({
    chests,
    tabs,
    updateChests,
    getNextChestId,
    setUndoStack,
    setRedoStack,
    setModalVisible,
    setChestToDelete,
}: UseChestsProps): UseChestsReturn => {

    const addChest = useCallback(() => {
        setUndoStack(prev => [...prev, tabs]);
        setRedoStack([]);
        const newChestId = getNextChestId();
        const newChest: Chest = { id: newChestId, label: 'Barrel', items: [], icon: 'barrel', checked: false };
        updateChests([...(chests || []), newChest]);
    }, [chests, tabs, updateChests, getNextChestId, setUndoStack, setRedoStack]);

    const handleDeleteChest = useCallback((id: number) => {
        setUndoStack(prev => [...prev, tabs]);
        setRedoStack([]);
        const newChests = (chests || []).filter(chest => chest.id !== id);
        updateChests(newChests);
        setModalVisible(false);
    }, [chests, tabs, updateChests, setUndoStack, setRedoStack, setModalVisible]);

    const confirmDeleteChest = useCallback((id: number) => {
        const toRemove = (chests || []).find(chest => chest.id === id);
        if (toRemove && toRemove.items.length > 0) {
            setChestToDelete(id);
            setModalVisible(true);
        } else {
            handleDeleteChest(id);
        }
    }, [chests, handleDeleteChest, setChestToDelete, setModalVisible]);

    const updateChestLabel = useCallback((id: number, label: string) => {
        const newChests = (chests || []).map(chest => (chest.id === id ? { ...chest, label } : chest));
        updateChests(newChests);
    }, [chests, updateChests]);

    const updateChestIcon = useCallback((id: number, icon: string) => {
        const newChests = (chests || []).map(chest => (chest.id === id ? { ...chest, icon } : chest));
        updateChests(newChests);
    }, [chests, updateChests]);

    const removeItemFromChest = useCallback((chestId: number, item: Item) => {
        setUndoStack(prev => [...prev, tabs]);
        setRedoStack([]);
        const newChests = (chests || []).map(chest => {
            if (chest.id === chestId) {
                return { ...chest, items: chest.items.filter(chestItem => chestItem.item !== item.item) };
            }
            return chest;
        });
        updateChests(newChests);
    }, [chests, tabs, updateChests, setUndoStack, setRedoStack]);

    return {
        addChest,
        handleDeleteChest,
        confirmDeleteChest,
        updateChestLabel,
        updateChestIcon,
        removeItemFromChest,
    };
};
