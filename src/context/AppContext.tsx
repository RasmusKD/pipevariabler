import React, { createContext, useContext, ReactNode } from 'react';
import { Tab } from '../types';

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

// Combined context for simplicity
interface AppContextType {
    profile: ProfileContextType;
    tabs: TabsContextType;
    settings: SettingsContextType;
    view: ViewContextType;
    selection: SelectionContextType;
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

// Custom hooks for each context section
export const useProfile = (): ProfileContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useProfile must be used within AppProvider');
    return context.profile;
};

export const useTabs = (): TabsContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useTabs must be used within AppProvider');
    return context.tabs;
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useSettings must be used within AppProvider');
    return context.settings;
};

export const useView = (): ViewContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useView must be used within AppProvider');
    return context.view;
};

export const useSelection = (): SelectionContextType => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useSelection must be used within AppProvider');
    return context.selection;
};

export type { AppContextType, ProfileContextType, TabsContextType, SettingsContextType, ViewContextType, SelectionContextType };
