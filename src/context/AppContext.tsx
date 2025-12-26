import React, { createContext, useContext, ReactNode } from 'react';
import { Tab, Item, Chest } from '../types';
import { SensorDescriptor, SensorOptions, DndContextProps } from '@dnd-kit/core';

// Profile state and actions
interface ProfileContextType {
    profileName: string;
    setProfileName: (name: string) => void;
    isEditingProfileName: boolean;
    setIsEditingProfileName: (editing: boolean) => void;
}

// Tabs state and actions
interface TabsContextType {
    tabs: Tab[];
    activeTabId: number;
    setActiveTabId: (id: number) => void;
    isEditingTabName: number | null;
    setIsEditingTabName: (id: number | null) => void;
    updateTabName: (id: number, name: string) => void;
    addTab: () => void;
    removeTab: (id: number) => void;
    moveTab: (fromIndex: number, toIndex: number) => void;
}

// Settings/Profile management actions
interface SettingsContextType {
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onShare: () => void;
    onCopyCode: () => void;
    onImportCode: () => void;
    onNewProfile: () => void;
    onLoadPreset: (presetName: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    undoDisabled: boolean;
    redoDisabled: boolean;
    profileVersion: number;
}

// View state
interface ViewContextType {
    chestGridView: boolean;
    setChestGridView: (view: boolean) => void;
    isGridView: boolean;
    setIsGridView: (view: boolean) => void;
    showAll: boolean;
    setShowAll: (show: boolean) => void;
}

// Selection state
interface SelectionContextType {
    selectedItems: Set<string>;
    handleItemSelect: (uid: string, ctrlKey: boolean, isClick?: boolean) => void;
}

// Search state
interface SearchContextType {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

// Data state (Items & Layout map)
interface DataContextType {
    items: Item[];
    itemsToShow: Item[];
    chestItemsMap: Map<string, { chestId: number; displayIndex: number }[]>;
    handleChestClick: (chestId: number, itemName?: string) => void;
}

// Layout state
interface LayoutContextType {
    listHeight: number;
    setListHeight: (height: number) => void;
    listContainerRef: React.RefObject<HTMLDivElement | null>;
    gridContainerRef: React.RefObject<HTMLDivElement | null>;
    tabScrollRef: React.RefObject<HTMLDivElement | null>;
}

// Chest Actions (from useChests)
interface ChestsContextType {
    addChest: () => void;
    confirmDeleteChest: (id: number) => void;
    updateChestLabel: (id: number, label: string) => void;
    updateChestIcon: (id: number, icon: string) => void;
    removeItemFromChest: (chestId: number, item: Item) => void;
    updateChests: (newChests: Chest[]) => void;
    globalChestOffset: number;
    incomingChest: Chest | null;
    sidebarCloneId: string | null;
    displayChests: Chest[];
}

// Drag & Drop Context (for DndContext properties)
interface DndDragContextType {
    sensors: any;
    activeId: string | number | null;
    activeItem: Item | Chest | null;
    handleDragStart: (event: any) => void;
    handleDragOver: (event: any) => void;
    handleDragEnd: (event: any) => void;
    handleDragCancel: () => void;
    dropAnimation: any;
    dragSourceIsItemRef: React.MutableRefObject<boolean>;
}

// Combined context
interface AppContextType {
    profile: ProfileContextType;
    tabs: TabsContextType;
    settings: SettingsContextType;
    view: ViewContextType;
    selection: SelectionContextType;
    search: SearchContextType;
    data: DataContextType;
    layout: LayoutContextType;
    chests: ChestsContextType;
    dnd: DndDragContextType;
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
interface AppProviderProps {
    children: ReactNode;
    value: AppContextType;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, value }) => {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hooks
const createHook = <T,>(prop: keyof AppContextType, name: string) => (): T => {
    const context = useContext(AppContext);
    if (!context) throw new Error(`${name} must be used within AppProvider`);
    return context[prop] as T;
};

export const useProfile = createHook<ProfileContextType>('profile', 'useProfile');
export const useTabs = createHook<TabsContextType>('tabs', 'useTabs');
export const useSettings = createHook<SettingsContextType>('settings', 'useSettings');
export const useView = createHook<ViewContextType>('view', 'useView');
export const useSelection = createHook<SelectionContextType>('selection', 'useSelection');
export const useSearch = createHook<SearchContextType>('search', 'useSearch');
export const useData = createHook<DataContextType>('data', 'useData');
export const useLayout = createHook<LayoutContextType>('layout', 'useLayout');
export const useChestsContext = createHook<ChestsContextType>('chests', 'useChestsContext');
export const useDndDrag = createHook<DndDragContextType>('dnd', 'useDndDrag');

export type { AppContextType, ProfileContextType, TabsContextType, SettingsContextType, ViewContextType, SelectionContextType };

