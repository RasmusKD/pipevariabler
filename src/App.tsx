import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  useDroppable,
  useDndContext,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { FaCog, FaCaretDown, FaTimes, FaEdit, FaPlus, FaTh, FaBars, FaSearch } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import './scss/main.scss';
import itemsData from './data.json';
import ItemComponent from './ItemComponent';
import ChestComponent from './ChestComponent';
import SpriteIcon from './SpriteIcon';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from './ConfirmationModal';

import { DraggableSource } from './dnd/DraggableSource';
import { Item, Chest, Tab, Profile } from './types';
import { canAddItemToChest, addItemToChest, cloneItemWithNewUid } from './chestUtils';


// Drop zone for creating new chests - can drag item here to create chest with that item
const AddChestDropZone: React.FC<{
  onAddChest: () => void;
}> = ({ onAddChest }) => {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: 'add-chest-drop-zone',
  });

  const isDraggingItem = active && typeof active.id === 'string';
  const showItemHighlight = isDraggingItem && isOver;

  return (
    <div
      ref={setNodeRef}
      onClick={onAddChest}
      className={`flex items-center justify-center border-2 border-dashed rounded p-4 min-h-[200px] transition-colors cursor-pointer ${showItemHighlight
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900'
        }`}
    >
      <div className="flex flex-col items-center gap-3 p-6 text-neutral-400">
        <FaPlus size={24} />
        <span className="text-lg font-medium">
          {showItemHighlight
            ? 'Slip for at oprette kiste'
            : 'Tilføj kiste'}
        </span>
      </div>
    </div>
  );
};

// Droppable tab wrapper - switches to tab when dragging over it
const DroppableTab: React.FC<{
  tabId: number;
  isActive: boolean;
  isEditing: boolean;
  onSwitchTab: (tabId: number) => void;
  children: (showHighlight: boolean) => React.ReactNode;
}> = ({ tabId, isActive, isEditing, onSwitchTab, children }) => {
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

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number>(1);

  const [showAll, setShowAll] = useState<boolean>(() => JSON.parse(localStorage.getItem('showAll') || 'true'));
  const [isGridView, setIsGridView] = useState<boolean>(() => JSON.parse(localStorage.getItem('isGridView') || 'false'));
  const [chestGridView, setChestGridView] = useState<boolean>(() => JSON.parse(localStorage.getItem('chestGridView') || 'false'));

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [listHeight, setListHeight] = useState(window.innerHeight - 250);
  const [undoStack, setUndoStack] = useState<Tab[][]>([]);
  const [redoStack, setRedoStack] = useState<Tab[][]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProfileModalVisible, setNewProfileModalVisible] = useState(false);
  const [importProfileModalVisible, setImportProfileModalVisible] = useState(false);
  const [deleteTabModalVisible, setDeleteTabModalVisible] = useState(false);
  const [chestToDelete, setChestToDelete] = useState<number | null>(null);
  const [tabToDelete, setTabToDelete] = useState<number | null>(null);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [isEditingTabName, setIsEditingTabName] = useState<number | null>(null);
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const listContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]);
  const chests = useMemo(() => activeTab?.chests || [], [activeTab]);

  // Compute global offset for current tab's chests (how many chests exist in previous tabs)
  const globalChestOffset = useMemo(() => {
    let offset = 0;
    for (const tab of tabs) {
      if (tab.id === activeTabId) break;
      offset += tab.chests.length;
    }
    return offset;
  }, [tabs, activeTabId]);

  const getNextChestId = useCallback(() => {
    let maxId = 0;
    tabs.forEach(tab => tab.chests.forEach(chest => { if (chest.id > maxId) maxId = chest.id; }));
    return maxId + 1;
  }, [tabs]);

  /* Dnd Sensors - distance: 3 means you need to move 3px before drag starts, allowing clicks for selection */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      const profile: Profile = JSON.parse(savedProfile);
      setProfileName(profile.name);

      if (profile.tabs) {
        let globalChestId = 1;
        const processedTabs = profile.tabs.map(tab => ({
          ...tab,
          chests: tab.chests.map((chest: any) => ({
            ...chest,
            id: globalChestId++,
            icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
            checked: chest.checked || false,
            items: (chest.items || []).map((i: any) => ({ ...i, uid: i.uid || Math.random().toString(36).substr(2, 9) }))
          }))
        }));
        setTabs(processedTabs);
        setActiveTabId(processedTabs[0]?.id || 1);
      } else if (profile.chests) {
        const processedChests = profile.chests.map((chest: any, index: number) => ({
          ...chest,
          id: index + 1,
          icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
          checked: chest.checked || false,
          items: (chest.items || []).map((i: any) => ({ ...i, uid: i.uid || Math.random().toString(36).substr(2, 9) }))
        }));
        const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: processedChests };
        setTabs([defaultTab]);
        setActiveTabId(1);
      }
    } else {
      setProfileName('Ny Profil');
      const defaultChest: Chest = { id: 1, label: 'Min første kiste', items: [], icon: 'barrel', checked: false };
      const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: [defaultChest] };
      setTabs([defaultTab]);
      setActiveTabId(1);
    }
  }, []);

  useEffect(() => {
    const sortedItems = itemsData.items.sort((a, b) => a.item.localeCompare(b.item));
    setItems(sortedItems.map(i => ({ ...i, uid: i.item })));
  }, []);

  useEffect(() => {
    if (tabs.length > 0 && profileName) {
      const profile: Profile = { name: profileName, tabs };
      localStorage.setItem('profile', JSON.stringify(profile));
    }
  }, [tabs, profileName]);

  useEffect(() => { localStorage.setItem('showAll', JSON.stringify(showAll)); }, [showAll]);
  useEffect(() => { localStorage.setItem('isGridView', JSON.stringify(isGridView)); }, [isGridView]);
  useEffect(() => { localStorage.setItem('chestGridView', JSON.stringify(chestGridView)); }, [chestGridView]);

  useEffect(() => {
    const el = document.getElementById(`tab-btn-${activeTabId}`);
    const scroller = tabScrollRef.current;
    if (!el || !scroller) return;
    const elLeft = (el as HTMLElement).offsetLeft;
    const elRight = elLeft + (el as HTMLElement).offsetWidth;
    const visibleLeft = scroller.scrollLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;
    if (elLeft < visibleLeft) scroller.scrollTo({ left: elLeft - 16, behavior: 'smooth' });
    else if (elRight > visibleRight) scroller.scrollTo({ left: elRight - scroller.clientWidth + 16, behavior: 'smooth' });
  }, [activeTabId]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);

  const handleImportProfile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const profile = JSON.parse(fileReader.result as string);
      setPendingProfile(profile);
      setImportProfileModalVisible(true);
    };
    if (event.target.files && event.target.files.length > 0) fileReader.readAsText(event.target.files[0]);
  }, []);

  const handleExportProfile = useCallback(() => {
    const profile: Profile = { name: profileName, tabs };
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profileName, tabs]);

  const confirmNewProfile = () => {
    const defaultChest: Chest = { id: 1, label: 'Min første kiste', items: [], icon: 'barrel', checked: false };
    const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: [defaultChest] };
    setTabs([defaultTab]);
    setActiveTabId(1);
    setProfileName('Ny Profil');
    setShowAll(true);
    setNewProfileModalVisible(false);
  };

  const createNewProfile = useCallback(() => {
    if (tabs.some(tab => tab.chests.length > 0)) {
      setNewProfileModalVisible(true);
    } else {
      const defaultChest: Chest = { id: 1, label: 'Min første kiste', items: [], icon: 'barrel', checked: false };
      const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: [defaultChest] };
      setTabs([defaultTab]);
      setActiveTabId(1);
      setProfileName('Ny Profil');
      setShowAll(true);
    }
  }, [tabs]);

  const cancelNewProfile = () => setNewProfileModalVisible(false);

  const confirmImportProfile = () => {
    if (!pendingProfile) return;
    tabs.forEach(tab => tab.chests.forEach(chest => localStorage.removeItem(`chest-checked-${chest.id}`)));
    setProfileName(pendingProfile.name);

    if (pendingProfile.tabs) {
      let globalChestId = 1;
      const processedTabs = pendingProfile.tabs.map(tab => ({
        ...tab,
        chests: tab.chests.map((chest: any) => ({
          ...chest,
          id: globalChestId++,
          icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
          checked: chest.checked || false,
        }))
      }));
      setTabs(processedTabs);
      setActiveTabId(processedTabs[0]?.id || 1);
    } else if (pendingProfile.chests) {
      const processedChests = pendingProfile.chests.map((chest: any, index: number) => ({
        ...chest,
        id: index + 1,
        icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
        checked: chest.checked || false,
      }));
      const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: processedChests };
      setTabs([defaultTab]);
      setActiveTabId(1);
    }

    setPendingProfile(null);
    setImportProfileModalVisible(false);

    toast.success('Profil importeret!', {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      theme: 'dark',
      transition: Zoom,
      closeButton: false,
    });
  };

  const cancelImportProfile = () => { setPendingProfile(null); setImportProfileModalVisible(false); };

  const addTab = useCallback(() => {
    const newTabId = Math.max(...tabs.map(tab => tab.id), 0) + 1;
    const nextChestId = getNextChestId();
    const defaultChest: Chest = { id: nextChestId, label: 'Min første kiste', items: [], icon: 'barrel', checked: false };
    const newTab: Tab = { id: newTabId, name: `Tab ${newTabId}`, chests: [defaultChest] };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
  }, [tabs, getNextChestId]);

  const handleDeleteTab = useCallback((tabId: number) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) setActiveTabId(newTabs[0]?.id || 1);
    setDeleteTabModalVisible(false);
  }, [tabs, activeTabId]);

  const removeTab = useCallback((tabId: number) => {
    if (tabs.length === 1) return;
    const tabToRemove = tabs.find(tab => tab.id === tabId);
    if (tabToRemove && tabToRemove.chests.some(chest => chest.items.length > 0)) {
      setTabToDelete(tabId);
      setDeleteTabModalVisible(true);
    } else {
      handleDeleteTab(tabId);
    }
  }, [tabs, handleDeleteTab]);

  const confirmDeleteTab = () => {
    if (tabToDelete !== null) {
      handleDeleteTab(tabToDelete);
      setTabToDelete(null);
    }
  };
  const cancelDeleteTab = () => { setTabToDelete(null); setDeleteTabModalVisible(false); };

  const updateTabName = useCallback((tabId: number, name: string) => {
    setTabs(prev => prev.map(tab => (tab.id === tabId ? { ...tab, name } : tab)));
  }, []);

  const updateChests = useCallback((newChests: Chest[]) => {
    setTabs(prev => prev.map(tab => (tab.id === activeTabId ? { ...tab, chests: newChests } : tab)));
  }, [activeTabId]);

  const filteredItems = useMemo(
    () => items.filter(item => item.item.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, '_'))),
    [items, searchTerm]
  );

  // Map item names to their chest locations with global sequential IDs across all tabs
  const chestItemsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    let globalIndex = 0;
    tabs.forEach(tab => {
      tab.chests.forEach(chest => {
        globalIndex++;
        chest.items.forEach(item => {
          if (!map.has(item.item)) map.set(item.item, []);
          map.get(item.item)!.push(globalIndex);
        });
      });
    });
    return map;
  }, [tabs]);

  const itemsToShow = useMemo(
    () => (showAll ? filteredItems : filteredItems.filter(item => !chestItemsMap.has(item.item))),
    [filteredItems, showAll, chestItemsMap]
  );

  const addChest = useCallback(() => {
    setUndoStack(prev => [...prev, tabs]);
    setRedoStack([]);
    const newChestId = getNextChestId();
    const newChest: Chest = { id: newChestId, label: 'Barrel', items: [], icon: 'barrel', checked: false };
    updateChests([...(chests || []), newChest]);
  }, [chests, tabs, updateChests, getNextChestId]);

  const handleDeleteChest = useCallback((id: number) => {
    setUndoStack(prev => [...prev, tabs]);
    setRedoStack([]);
    const newChests = (chests || []).filter(chest => chest.id !== id);
    updateChests(newChests);
    setModalVisible(false);
  }, [chests, tabs, updateChests]);

  const confirmDeleteChest = useCallback((id: number) => {
    const toRemove = (chests || []).find(chest => chest.id === id);
    if (toRemove && toRemove.items.length > 0) {
      setChestToDelete(id);
      setModalVisible(true);
    } else {
      handleDeleteChest(id);
    }
  }, [chests, handleDeleteChest]);

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
  }, [chests, tabs, updateChests]);



  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndo = [...undoStack];
      const prevState = newUndo.pop()!;
      setRedoStack(prev => [...prev, tabs]);
      setTabs(prevState);
      setUndoStack(newUndo);
    }
  }, [undoStack, tabs]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedo = [...redoStack];
      const nextState = newRedo.pop()!;
      setUndoStack(prev => [...prev, tabs]);
      setTabs(nextState);
      setRedoStack(newRedo);
    }
  }, [redoStack, tabs]);

  const handleClearSearch = () => setSearchTerm('');

  // Handle item selection (Ctrl+click to toggle, click to select/keep selection for dragging)
  const handleItemSelect = useCallback((uid: string, ctrlKey: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (ctrlKey) {
        // Ctrl+click: Toggle selection
        if (newSet.has(uid)) {
          newSet.delete(uid);
        } else {
          newSet.add(uid);
        }
      } else {
        // Regular click:
        // If this item is already selected, keep the selection (for dragging multiple)
        // If not selected, clear and select only this item
        if (!newSet.has(uid)) {
          newSet.clear();
          newSet.add(uid);
        }
        // If already selected, do nothing (keep the selection intact for drag)
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = itemsToShow[index];
    const chestIds = chestItemsMap.get(item.item);
    const isSelected = selectedItems.has(item.uid);
    return (
      <div style={style} key={item.uid}>
        <DraggableSource id={item.uid} className="h-full">
          <ItemComponent
            item={item}
            index={index}
            lastIndex={itemsToShow.length - 1}
            chestIds={chestIds}
            isGridView={false}
            isSelected={isSelected}
            onSelect={handleItemSelect}
          />
        </DraggableSource>
      </div>
    );
  };

  const updateHeights = () => {
    const listContainer = listContainerRef.current;
    const gridContainer = gridContainerRef.current;
    if (listContainer) {
      const boundingRect = listContainer.getBoundingClientRect();
      setListHeight(window.innerHeight - boundingRect.top - 20);
    }
    if (gridContainer) {
      const boundingRect = gridContainer.getBoundingClientRect();
      gridContainer.style.maxHeight = `${window.innerHeight - boundingRect.top - 20}px`;
    }
  };

  useEffect(() => {
    updateHeights();
    window.addEventListener('resize', updateHeights);
    return () => window.removeEventListener('resize', updateHeights);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [activeItem, setActiveItem] = useState<Item | Chest | null>(null);

  // Detect if we're dragging a chest from another tab into this one
  const incomingChest = useMemo(() => {
    if (activeId === null || typeof activeId !== 'number') return null;
    // Check if this chest is NOT in current tab
    if (chests.some(c => c.id === activeId)) return null;
    // Find it in other tabs
    for (const tab of tabs) {
      if (tab.id === activeTabId) continue;
      const chest = tab.chests.find(c => c.id === activeId);
      if (chest) return chest;
    }
    return null;
  }, [activeId, chests, tabs, activeTabId]);

  // Display chests includes placeholder for incoming cross-tab chest
  const displayChests = useMemo(() => {
    if (!incomingChest) return chests;
    // Add the incoming chest at the end as a placeholder
    return [...chests, incomingChest];
  }, [chests, incomingChest]);

  const findItem = (id: string | number) => {
    // Check source items
    const sourceItem = items.find(i => i.uid === id);
    if (sourceItem) return sourceItem;
    // Check chest items
    for (const chest of chests) {
      const chestItem = chest.items.find(i => i.uid === id);
      if (chestItem) return chestItem;
    }
    // Check chests
    const chest = chests.find(c => c.id === id);
    if (chest) return chest;
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setActiveItem(findItem(event.active.id) as any);
  };

  // Enable scroll wheel during drag (and prevent browser zoom with Ctrl+wheel)
  useEffect(() => {
    if (!activeId) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser zoom during drag
      if (e.ctrlKey) {
        e.preventDefault();
      }
      // Find the main scrollable container and scroll it
      const mainContent = document.querySelector('.grid-cols-auto-fit');
      if (mainContent) {
        mainContent.scrollTop += e.deltaY;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeId]);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // If dragging a chest, do nothing (handled in End)
    if (typeof active.id === 'number') return;

    // Handle Item Dragging
    const activeId = active.id as string;
    const overId = over.id as string | number;

    // Source Item -> Chest
    // Handled in DragEnd (addition)

    // Chest Item -> Chest Item (Sorting same container)
    // Chest Item -> Chest Item (Different container)
    // Chest Item -> Chest (Empty container)

    // We need to implement complex transfer logic if we want "snappy" move between lists.
    // For now, let's keep it simple: DragEnd updates state.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    // Chest Sorting/Moving
    if (typeof active.id === 'number') {
      const activeChestId = active.id;

      // Find source tab and chest
      let sourceTabId: number | null = null;
      let sourceChest: Chest | null = null;
      for (const tab of tabs) {
        const chest = tab.chests.find(c => c.id === activeChestId);
        if (chest) {
          sourceTabId = tab.id;
          sourceChest = chest;
          break;
        }
      }

      if (!sourceChest || sourceTabId === null) return;

      // Determine target
      let targetTabId = activeTabId; // Default to active tab
      let targetChestId: number | null = null;

      // Dropped on another chest
      if (typeof over.id === 'number') {
        targetChestId = over.id;
      }
      // Dropped on a tab drop zone - move to that tab's end
      else if (typeof over.id === 'string' && over.id.startsWith('tab-drop-')) {
        targetTabId = parseInt(over.id.replace('tab-drop-', ''), 10);
      }

      // Same tab, same position - nothing to do
      if (sourceTabId === targetTabId && targetChestId === activeChestId) return;

      setUndoStack(prev => [...prev, tabs]);
      setRedoStack([]);

      // Same tab - just reorder
      if (sourceTabId === targetTabId && targetChestId !== null) {
        const oldIndex = chests.findIndex(c => c.id === activeChestId);
        const newIndex = chests.findIndex(c => c.id === targetChestId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          updateChests(arrayMove(chests, oldIndex, newIndex));
        }
      } else {
        // Cross-tab move
        const newTabs = tabs.map(tab => {
          // Remove from source tab
          if (tab.id === sourceTabId) {
            return { ...tab, chests: tab.chests.filter(c => c.id !== activeChestId) };
          }
          // Add to target tab
          if (tab.id === targetTabId) {
            if (targetChestId !== null) {
              // Insert at specific position
              const targetIndex = tab.chests.findIndex(c => c.id === targetChestId);
              const newChests = [...tab.chests];
              newChests.splice(targetIndex, 0, sourceChest!);
              return { ...tab, chests: newChests };
            } else {
              // Add to end
              return { ...tab, chests: [...tab.chests, sourceChest!] };
            }
          }
          return tab;
        });
        setTabs(newTabs);
      }
      return;
    }

    // Item Dropping/Sorting logic
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Is source item?
    const isSource = items.some(i => i.uid === activeIdStr);

    // Get all items to add (if active is selected, add all selected; otherwise just the one)
    const getItemsToAdd = (): Item[] => {
      if (!isSource) return [];
      if (selectedItems.has(activeIdStr) && selectedItems.size > 1) {
        // Return all selected items, ordered by the items array order
        return items.filter(i => selectedItems.has(i.uid));
      }
      // Just the dragged item
      const singleItem = items.find(i => i.uid === activeIdStr);
      return singleItem ? [singleItem] : [];
    };

    // Handle dropping on "Add Chest" drop zone
    if (over.id === 'add-chest-drop-zone' && isSource) {
      const itemsToAdd = getItemsToAdd();
      if (itemsToAdd.length > 0) {
        setUndoStack(prev => [...prev, tabs]);
        setRedoStack([]);
        const newChestId = getNextChestId();
        // First item determines icon and name
        const firstItem = itemsToAdd[0];
        const itemName = firstItem.item.replace(/_/g, ' ');
        const itemIcon = firstItem.image.replace('.png', '');
        // Clone all items with new UIDs
        const newItems = itemsToAdd.map(item => cloneItemWithNewUid(item));
        const newChest: Chest = {
          id: newChestId,
          label: itemName.charAt(0).toUpperCase() + itemName.slice(1),
          items: newItems,
          icon: itemIcon,
          checked: false
        };
        updateChests([...(chests || []), newChest]);
        clearSelection();
        return;
      }
    }



    // Find target chest
    let targetChestId: number | null = null;
    let targetIndex: number | null = null;

    // If over a chest directly
    if (typeof over.id === 'number') {
      targetChestId = over.id;
      // findchest
      const targetChest = chests.find(c => c.id === targetChestId);
      targetIndex = targetChest ? targetChest.items.length : 0;
    } else if (typeof over.id === 'string' && over.id.startsWith('chest-drop-')) {
      // Over a chest drop zone (e.g., "chest-drop-1")
      targetChestId = parseInt(over.id.replace('chest-drop-', ''), 10);
      const targetChest = chests.find(c => c.id === targetChestId);
      targetIndex = targetChest ? targetChest.items.length : 0;
    } else {
      // Over another item? Find which chest specific item belongs to
      for (const chest of chests) {
        const idx = chest.items.findIndex(i => i.uid === overIdStr);
        if (idx !== -1) {
          targetChestId = chest.id;
          targetIndex = idx;
          break;
        }
      }
    }

    if (targetChestId !== null) {
      setUndoStack(prev => [...prev, tabs]);
      setRedoStack([]);

      if (isSource) {
        // Add items from sidebar (possibly multiple if multi-selected)
        const itemsToAdd = getItemsToAdd();
        if (itemsToAdd.length > 0) {
          const newChests = chests.map(c => {
            if (c.id === targetChestId) {
              let updatedItems = [...c.items];
              // Add each item that doesn't already exist in the chest
              for (const item of itemsToAdd) {
                const newItem = cloneItemWithNewUid(item);
                if (canAddItemToChest({ ...c, items: updatedItems }, newItem)) {
                  updatedItems.push(newItem);
                }
              }
              return { ...c, items: updatedItems };
            }
            return c;
          });
          updateChests(newChests);
          clearSelection();
        }
      } else {
        // Moving existing item from one chest to another (possibly across tabs)
        // Find source chest ACROSS ALL TABS
        let sourceTabId: number | null = null;
        let sourceChestId: number | null = null;
        let sourceIndex: number | null = null;
        let sourceItem: Item | null = null;

        for (const tab of tabs) {
          for (const chest of tab.chests) {
            const idx = chest.items.findIndex(i => i.uid === activeIdStr);
            if (idx !== -1) {
              sourceTabId = tab.id;
              sourceChestId = chest.id;
              sourceIndex = idx;
              sourceItem = chest.items[idx];
              break;
            }
          }
          if (sourceChestId !== null) break;
        }

        if (sourceChestId !== null && sourceIndex !== null && sourceItem) {
          // Same tab, same chest - just reorder
          if (sourceChestId === targetChestId && typeof targetIndex === 'number') {
            const chest = chests.find(c => c.id === sourceChestId)!;
            const newItems = arrayMove(chest.items, sourceIndex, targetIndex);
            updateChests(chests.map(c => c.id === sourceChestId ? { ...c, items: newItems } : c));
          } else {
            // Cross-chest move (possibly cross-tab)
            // Check if target chest can accept the item
            const targetChest = chests.find(c => c.id === targetChestId);
            if (targetChest && !canAddItemToChest(targetChest, sourceItem)) {
              // Already has this item, don't add (but still remove from source)
              // Only remove if same tab
              if (sourceTabId === activeTabId) {
                updateChests(chests.map(c =>
                  c.id === sourceChestId
                    ? { ...c, items: c.items.filter(i => i.uid !== activeIdStr) }
                    : c
                ));
              }
              return;
            }

            // Update tabs to handle cross-tab moves
            const newTabs = tabs.map(tab => ({
              ...tab,
              chests: tab.chests.map(chest => {
                // Remove from source chest
                if (chest.id === sourceChestId) {
                  return { ...chest, items: chest.items.filter(i => i.uid !== activeIdStr) };
                }
                // Add to target chest
                if (chest.id === targetChestId) {
                  const newItems = addItemToChest(chest, sourceItem!, targetIndex);
                  if (newItems === null) return chest;
                  return { ...chest, items: newItems };
                }
                return chest;
              })
            }));
            setTabs(newTabs);
          }
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      autoScroll={{
        enabled: true,
        acceleration: 25, // Faster scroll speed
        threshold: { x: 0.1, y: 0.1 }, // Wider activation zone
      }}
    >
      <div className="flex flex-col min-h-screen overflow-x-hidden bg-neutral-950 text-white">
        <div className="flex flex-1 flex-col md:flex-row h-full min-h-0">
          {/* SIDEBAR */}
          <aside className="p-4 border-b md:border-r flex-shrink-0 gap-4 flex flex-col bg-neutral-900 border-neutral-800 dark-theme">
            <div className="logo-dark" />

            {/* Search with icon */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <FaSearch size={14} />
              </div>
              <input
                type="text"
                spellCheck="false"
                value={searchTerm}
                placeholder="Søg..."
                className="border pl-9 pr-10 py-2 w-full bg-neutral-800 border-neutral-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleSearch}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                  onClick={handleClearSearch}
                  aria-label="Ryd søgning"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>

            {/* Item-liste header + toggles */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Item liste</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${showAll
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  title={showAll ? 'Vis kun items i kister' : 'Vis alle items'}
                >
                  <span>Vis alle</span>
                </button>

                <button
                  onClick={() => setIsGridView(!isGridView)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm text-neutral-300 hover:text-white"
                  title={isGridView ? 'Item-liste: Listevisning' : 'Item-liste: Gittervisning'}
                  aria-pressed={isGridView}
                >
                  {isGridView ? <FaBars size={14} /> : <FaTh size={14} />}
                  <span>{isGridView ? 'Liste' : 'Gitter'}</span>
                </button>
              </div>
            </div>

            <div ref={listContainerRef} className="flex-1 overflow-auto dark-theme overflow-x-hidden">
              {isGridView ? (
                <div className="h-full" style={{ height: listHeight }}>
                  <div className="grid grid-cols-6 gap-2">
                    {itemsToShow.map((item, index) => (
                      <DraggableSource key={item.uid} id={item.uid}>
                        <ItemComponent
                          item={item}
                          index={index}
                          lastIndex={itemsToShow.length - 1}
                          chestIds={chestItemsMap.get(item.item)}
                          isGridView
                          isSelected={selectedItems.has(item.uid)}
                          onSelect={handleItemSelect}
                        />
                      </DraggableSource>
                    ))}
                  </div>
                </div>
              ) : (
                <List className="dark-theme" height={listHeight} itemCount={itemsToShow.length} itemSize={50} width="100%">
                  {renderRow}
                </List>
              )}
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 p-4 flex flex-col gap-4 overflow-x-hidden">
            {/* HEADER – Tabs, Chest Grid Toggle (kvadratisk), Settings */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 h-8 w-full">
              {/* Profilnavn */}
              <div className="flex items-center gap-2">
                {isEditingProfileName ? (
                  <>
                    <input
                      type="text"
                      spellCheck="false"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="border p-2 rounded bg-neutral-800 border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Profilnavn"
                    />
                    <button className="text-blue-400 hover:text-blue-300 transition-colors" onClick={() => setIsEditingProfileName(false)}>Gem</button>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold">{profileName}</span>
                    <button className="text-blue-400 hover:text-blue-300 transition-colors" onClick={() => setIsEditingProfileName(true)} aria-label="Rediger profilnavn">
                      <FaEdit />
                    </button>
                  </>
                )}
              </div>

              {/* Tabs */}
              <div className="min-w-0 overflow-hidden">
                <div
                  ref={tabScrollRef}
                  onWheel={(e) => {
                    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
                    if (dx !== 0) {
                      e.preventDefault();
                      e.currentTarget.scrollLeft += dx;
                    }
                  }}
                  className="flex items-center gap-2 overflow-x-auto overflow-y-hidden dark-theme"
                  style={{ maxWidth: '100%', width: '100%' }}
                >
                  {tabs.map((tab, tabIndex) => {
                    // Compute chest ID range for this tab
                    let startId = 1;
                    for (let i = 0; i < tabIndex; i++) {
                      startId += tabs[i].chests.length;
                    }
                    const endId = startId + tab.chests.length - 1;
                    const rangeText = tab.chests.length > 0
                      ? startId === endId ? ` (${startId})` : ` (${startId}-${endId})`
                      : '';

                    return (
                      <DroppableTab
                        key={tab.id}
                        tabId={tab.id}
                        isActive={activeTabId === tab.id}
                        isEditing={isEditingTabName === tab.id}
                        onSwitchTab={setActiveTabId}
                      >
                        {(showHighlight) => (
                          <div className="flex items-center flex-shrink-0">
                            {isEditingTabName === tab.id ? (
                              <input
                                type="text"
                                spellCheck="false"
                                value={tab.name}
                                onChange={(e) => updateTabName(tab.id, e.target.value)}
                                onBlur={() => setIsEditingTabName(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTabName(null); }}
                                className="px-3 py-1 text-sm rounded bg-neutral-800 border-2 border-blue-500 text-white focus:outline-none min-w-[100px]"
                                autoFocus
                              />
                            ) : (
                              <button
                                id={`tab-btn-${tab.id}`}
                                type="button"
                                className={`flex-shrink-0 px-3 py-1 text-sm rounded border-b-2 transition-colors flex items-center gap-1 ${showHighlight
                                  ? 'ring-2 ring-inset ring-blue-500'
                                  : ''} ${activeTabId === tab.id
                                    ? 'bg-neutral-800 border-blue-400 text-white'
                                    : 'bg-neutral-900 border-transparent text-neutral-300 hover:text-white hover:bg-neutral-800'
                                  }`}
                                onClick={() => setActiveTabId(tab.id)}
                                onDoubleClick={() => setIsEditingTabName(tab.id)}
                              >
                                <span className="truncate">{tab.name}{rangeText}</span>
                                {tabs.length > 1 && (
                                  <span
                                    className="text-red-500 hover:text-red-400 transition-colors flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                                    title="Luk tab"
                                  >
                                    <FaTimes size={10} />
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </DroppableTab>
                    );
                  })}
                  <button
                    type="button"
                    className="flex-shrink-0 px-2 py-1 text-sm rounded border-2 border-dashed border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-white transition-colors"
                    onClick={addTab}
                    title="Tilføj nyt tab"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>

              {/* KVADRATISK chest grid/list toggle */}
              <div className="justify-self-end">
                <button
                  onClick={() => setChestGridView(!chestGridView)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors text-sm text-neutral-300 hover:text-white"
                  title={chestGridView ? 'Kister: Listevisning' : 'Kister: Gittervisning'}
                  aria-pressed={chestGridView}
                >
                  {chestGridView ? <FaBars size={14} /> : <FaTh size={14} />}
                  <span>{chestGridView ? 'Liste' : 'Gitter'}</span>
                </button>
              </div>

              {/* Settings */}
              <div className="relative z-50">
                <button
                  className="flex items-center space-x-2 p-2 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <FaCog />
                  <FaCaretDown />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 text-white rounded shadow-lg">
                    <div className="p-2">
                      <button
                        className="w-full text-left px-2 py-2 text-sm rounded hover:bg-neutral-800 transition-colors"
                        onClick={() => document.getElementById('import-profile')?.click()}
                      >
                        Importer Profil
                      </button>
                      <input
                        type="file"
                        onChange={handleImportProfile}
                        className="hidden"
                        accept="application/json"
                        id="import-profile"
                      />
                      <button
                        className="w-full text-left px-2 py-2 text-sm rounded hover:bg-neutral-800 transition-colors"
                        onClick={handleExportProfile}
                      >
                        Eksporter Profil
                      </button>
                      <button
                        className="w-full text-left px-2 py-2 text-sm rounded hover:bg-neutral-800 transition-colors"
                        onClick={createNewProfile}
                      >
                        Ny Profil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kister */}
            <div ref={gridContainerRef} className="grid-cols-auto-fit dark-theme overflow-x-hidden">
              <SortableContext items={displayChests.map(c => c.id)} strategy={rectSortingStrategy}>
                {displayChests.map((chest, index) => (
                  <ChestComponent
                    key={chest.id}
                    chest={chest}
                    index={globalChestOffset + index}
                    removeChest={confirmDeleteChest}
                    updateChestLabel={updateChestLabel}
                    updateChestIcon={updateChestIcon}
                    removeItemFromChest={removeItemFromChest}
                    gridView={chestGridView}
                    isPlaceholder={incomingChest?.id === chest.id}
                  />
                ))}
              </SortableContext>

              {/* Add Chest Drop Zone - also shows placeholder when dragging chest from another tab */}
              <AddChestDropZone
                onAddChest={addChest}
                isDraggingChestFromOtherTab={
                  activeId !== null &&
                  typeof activeId === 'number' &&
                  !chests.some(c => c.id === activeId)
                }
              />
            </div>
          </main>
        </div>

        <ToastContainer className="toast-container" position="top-center" autoClose={3000} limit={1} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss={false} pauseOnHover={false} theme="dark" />

        {modalVisible && (
          <ConfirmationModal
            onConfirm={() => handleDeleteChest(chestToDelete!)}
            onCancel={() => setModalVisible(false)}
            message="Er du sikker på, at du vil slette denne kiste? Den er ikke tom."
            title="Bekræft Sletning"
          />
        )}

        {newProfileModalVisible && (
          <ConfirmationModal
            onConfirm={confirmNewProfile}
            onCancel={cancelNewProfile}
            message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
            title="Ny Profil"
          />
        )}

        {importProfileModalVisible && (
          <ConfirmationModal
            onConfirm={confirmImportProfile}
            onCancel={cancelImportProfile}
            message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
            title="Importer Profil"
          />
        )}

        {deleteTabModalVisible && (
          <ConfirmationModal
            onConfirm={confirmDeleteTab}
            onCancel={cancelDeleteTab}
            message="Er du sikker på, at du vil slette dette tab? Det indeholder kister med indhold."
            title="Bekræft Tab Sletning"
          />
        )}
      </div>
      {/* Only center items on cursor, not chests */}
      <DragOverlay modifiers={activeItem && !('items' in activeItem) ? [snapCenterToCursor] : []} dropAnimation={null}>
        {activeId ? (
          activeItem && 'items' in activeItem ? (
            // Chest Overlay - use global position with fixed height matching grid
            <div className="opacity-90 min-w-[350px] text-white dark-theme" style={{ height: '280px' }}>
              <ChestComponent
                chest={activeItem as Chest}
                index={globalChestOffset + chests.findIndex(c => c.id === (activeItem as Chest).id)}
                removeChest={() => { }}
                updateChestLabel={() => { }}
                updateChestIcon={() => { }}
                removeItemFromChest={() => { }}
                gridView={chestGridView}
              />
            </div>
          ) : (
            // Item Overlay
            <div className="pointer-events-none inline-block relative">
              {activeItem && (
                <>
                  <SpriteIcon icon={(activeItem as Item).image} size={48} className="drop-shadow-xl" />
                  {/* Show badge if multiple items selected */}
                  {selectedItems.size > 1 && selectedItems.has((activeItem as Item).uid) && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                      {selectedItems.size}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default App;
