import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { FaTimes, FaEdit, FaPlus, FaTh, FaBars, FaSearch } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import './scss/main.scss';
import pako from 'pako';
import itemsData from './data.json';
import ItemComponent from './ItemComponent';
import ChestComponent from './ChestComponent';
import SpriteIcon from './SpriteIcon';

import ConfirmationModal from './ConfirmationModal';
import SettingsDropdown from './components/SettingsDropdown';
import DroppableTab from './components/DroppableTab';
import AddChestDropZone from './components/AddChestDropZone';
import { useProfileManager } from './hooks/useProfileManager';
import { useDragController } from './hooks/useDragController';

import { DraggableSource } from './dnd/Draggable';
import { Item, Chest, Tab, Profile } from './types';





const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [profileVersion, setProfileVersion] = useState(0);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number>(1);

  const [showAll, setShowAll] = useState<boolean>(() => JSON.parse(localStorage.getItem('showAll') || 'true'));
  const [isGridView, setIsGridView] = useState<boolean>(() => JSON.parse(localStorage.getItem('isGridView') || 'false'));
  const [chestGridView, setChestGridView] = useState<boolean>(() => JSON.parse(localStorage.getItem('chestGridView') || 'true'));

  const [listHeight, setListHeight] = useState(window.innerHeight - 250);
  const [undoStack, setUndoStack] = useState<Tab[][]>([]);
  const [redoStack, setRedoStack] = useState<Tab[][]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [isEditingTabName, setIsEditingTabName] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [chestToDelete, setChestToDelete] = useState<number | null>(null);
  const [importCodeModalVisible, setImportCodeModalVisible] = useState(false);
  const [importCodeValue, setImportCodeValue] = useState('');

  const {
    importProfileModalVisible,
    newProfileModalVisible,
    deleteTabModalVisible,
    presetModalVisible,
    handleImportProfile,
    handleExportProfile,
    confirmNewProfile,
    createNewProfile,
    cancelNewProfile,
    confirmImportProfile,
    cancelImportProfile,
    loadPreset,
    confirmLoadPreset,
    cancelLoadPreset,
    addTab,
    removeTab,
    confirmDeleteTab,
    cancelDeleteTab,
    updateTabName,
    getNextChestId
  } = useProfileManager({
    tabs,
    setTabs,
    profileName,
    setProfileName,
    activeTabId,
    setActiveTabId,
    setShowAll,
    setProfileVersion,
    setUndoStack,
    setRedoStack
  });

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



  /* Dnd Sensors moved to hook */

  useEffect(() => {
    // Create lookup map for images/variables
    const itemDataMap = new Map<string, { image: string; variable: string }>();
    itemsData.items.forEach((item: any) => {
      itemDataMap.set(item.item, { image: item.image, variable: item.variable });
    });

    const processItems = (items: any[]) => items.map((i: any) => {
      const dataItem = itemDataMap.get(i.item);
      return {
        ...i,
        image: i.image || dataItem?.image || `${i.item}.png`,
        variable: i.variable || dataItem?.variable || '',
        uid: i.uid || Math.random().toString(36).substr(2, 9)
      };
    });

    const loadProfile = (profile: any) => {
      setProfileName(profile.name || 'Delt Profil');
      let globalChestId = 1;
      let tabId = 1;

      if (profile.tabs) {
        const processedTabs = profile.tabs.map((tab: any) => ({
          ...tab,
          id: tabId++,
          chests: tab.chests.map((chest: any) => ({
            ...chest,
            id: globalChestId++,
            icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
            checked: chest.checked || false,
            items: processItems(chest.items || [])
          }))
        }));
        setTabs(processedTabs);
        setActiveTabId(processedTabs[0]?.id || 1);
      } else if (profile.chests) {
        const processedChests = profile.chests.map((chest: any) => ({
          ...chest,
          id: globalChestId++,
          icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
          checked: chest.checked || false,
          items: processItems(chest.items || [])
        }));
        const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: processedChests };
        setTabs([defaultTab]);
        setActiveTabId(1);
      }
    };

    // Check for shared profile in URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#p=') || hash.startsWith('#profile=')) {
      try {
        let jsonStr: string;
        if (hash.startsWith('#p=')) {
          // New compressed format
          const base64 = hash.substring('#p='.length);
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          jsonStr = pako.inflate(bytes, { to: 'string' });
        } else {
          // Old uncompressed format for backwards compatibility
          const base64 = hash.substring('#profile='.length);
          jsonStr = decodeURIComponent(escape(atob(base64)));
        }
        const sharedProfile = JSON.parse(jsonStr);
        loadProfile(sharedProfile);
        // Clear hash after loading
        window.history.replaceState(null, '', window.location.pathname);
        return;
      } catch (error) {
        console.error('Error loading shared profile:', error);
        // Fall through to localStorage
      }
    }

    // Load from localStorage
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      loadProfile(profile);
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

  const {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleItemSelect,
    dropAnimation,
    dragSourceIsItemRef
  } = useDragController({
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
  });

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

  // Share profile via URL
  const handleShare = useCallback(() => {
    // Create minimal profile structure (only item names, no images/variables)
    const minimalProfile = {
      name: profileName,
      tabs: tabs.map(tab => ({
        name: tab.name,
        chests: tab.chests.map(chest => ({
          label: chest.label,
          icon: chest.icon,
          items: chest.items.map(item => ({ item: item.item }))
        }))
      }))
    };

    try {
      const jsonStr = JSON.stringify(minimalProfile);
      // Compress with pako then base64 encode
      const compressed = pako.deflate(jsonStr);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));
      const shareUrl = `${window.location.origin}${window.location.pathname}#p=${base64}`;

      // Check if URL is too long for practical sharing
      if (shareUrl.length > 2000) {
        const proceed = window.confirm(
          `URL'en er ${shareUrl.length.toLocaleString()} tegn lang - for stor til de fleste browsere.\n\n` +
          `For store profiler anbefales "Eksporter Profil" i stedet.\n\n` +
          `Vil du stadig kopiere URL'en?`
        );
        if (!proceed) return;
      }

      navigator.clipboard.writeText(shareUrl).then(() => {
        alert(`URL kopieret! (${shareUrl.length.toLocaleString()} tegn)`);
      }).catch(() => {
        prompt('Kopier dette link:', shareUrl);
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      alert('Kunne ikke generere delelink');
    }
  }, [tabs, profileName]);

  // Copy profile as code (without URL)
  const handleCopyCode = useCallback(() => {
    const minimalProfile = {
      name: profileName,
      tabs: tabs.map(tab => ({
        name: tab.name,
        chests: tab.chests.map(chest => ({
          label: chest.label,
          icon: chest.icon,
          items: chest.items.map(item => ({ item: item.item }))
        }))
      }))
    };

    try {
      const jsonStr = JSON.stringify(minimalProfile);
      const compressed = pako.deflate(jsonStr);
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(compressed)));

      navigator.clipboard.writeText(base64).then(() => {
        alert(`Kode kopieret! (${base64.length.toLocaleString()} tegn)\n\nDel denne kode med andre - de kan importere den via "Importer Kode".`);
      }).catch(() => {
        prompt('Kopier denne kode:', base64);
      });
    } catch (error) {
      console.error('Error copying code:', error);
      alert('Kunne ikke generere kode');
    }
  }, [tabs, profileName]);

  // Open import code modal
  const handleImportCode = useCallback(() => {
    setImportCodeValue('');
    setImportCodeModalVisible(true);
  }, []);

  // Process the imported code
  const processImportCode = useCallback(() => {
    const code = importCodeValue.trim();
    if (!code) {
      alert('Indtast venligst en kode');
      return;
    }

    try {
      const binaryStr = atob(code);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const jsonStr = pako.inflate(bytes, { to: 'string' });
      const profile = JSON.parse(jsonStr);

      // Create lookup map for images/variables
      const itemDataMap = new Map<string, { image: string; variable: string }>();
      itemsData.items.forEach((item: any) => {
        itemDataMap.set(item.item, { image: item.image, variable: item.variable });
      });

      const processItems = (items: any[]) => items.map((i: any) => {
        const dataItem = itemDataMap.get(i.item);
        return {
          ...i,
          image: i.image || dataItem?.image || `${i.item}.png`,
          variable: i.variable || dataItem?.variable || '',
          uid: i.uid || Math.random().toString(36).substr(2, 9)
        };
      });

      setUndoStack(prev => [...prev, tabs]);
      setRedoStack([]);
      setProfileName(profile.name || 'Importeret Profil');

      let globalChestId = 1;
      let tabId = 1;

      // Increment profileVersion FIRST to force ChestComponent remount before setting new tabs
      // This prevents the scroll-to-bottom behavior from triggering on import
      setProfileVersion(v => v + 1);

      if (profile.tabs) {
        const processedTabs = profile.tabs.map((tab: any) => ({
          ...tab,
          id: tabId++,
          chests: tab.chests.map((chest: any) => ({
            ...chest,
            id: globalChestId++,
            icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
            checked: chest.checked || false,
            items: processItems(chest.items || [])
          }))
        }));
        setTabs(processedTabs);
        setActiveTabId(processedTabs[0]?.id || 1);
      } else if (profile.chests) {
        const processedChests = profile.chests.map((chest: any) => ({
          ...chest,
          id: globalChestId++,
          icon: chest.icon ? chest.icon.replace('.png', '') : 'barrel',
          checked: chest.checked || false,
          items: processItems(chest.items || [])
        }));
        const defaultTab: Tab = { id: 1, name: 'Tab 1', chests: processedChests };
        setTabs([defaultTab]);
        setActiveTabId(1);
      }
      setImportCodeModalVisible(false);
      setImportCodeValue('');
      alert('Profil importeret!');
    } catch (error) {
      console.error('Error importing code:', error);
      alert('Ugyldig kode. Tjek at du har kopieret hele koden korrekt.');
    }
  }, [importCodeValue, tabs, setUndoStack, setRedoStack]);

  const handleClearSearch = () => setSearchTerm('');


  // Navigate to a chest when clicking its ID in the sidebar
  const handleChestClick = useCallback((chestId: number, itemName?: string) => {
    // Find which tab contains this chest
    for (const tab of tabs) {
      const chest = tab.chests.find(c => c.id === chestId);
      if (chest) {
        // Switch to the tab if needed
        if (tab.id !== activeTabId) {
          setActiveTabId(tab.id);
        }
        // Scroll to chest after a brief delay for tab switch
        setTimeout(() => {
          const chestElement = document.querySelector(`[data-chest-id="${chestId}"]`);
          if (chestElement) {
            chestElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash highlight effect (same as drop hover)
            chestElement.classList.add('ring-2', 'ring-inset', 'ring-blue-500');
            setTimeout(() => {
              chestElement.classList.remove('ring-2', 'ring-inset', 'ring-blue-500');
            }, 1500);
            // If itemName provided, highlight that item in the chest
            if (itemName) {
              const itemInChest = chest.items.find(i => i.item === itemName);
              if (itemInChest) {
                setSelectedItems(new Set([itemInChest.uid]));
                // Scroll to the item
                setTimeout(() => {
                  const itemElement = chestElement.querySelector(`[data-item-id="${itemInChest.uid}"]`);
                  if (itemElement) {
                    itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }, 150);
                setTimeout(() => setSelectedItems(new Set()), 2000);
              }
            }
          }
        }, 100);
        return;
      }
    }
  }, [tabs, activeTabId]);

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
            onChestClick={handleChestClick}
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



  // Helper to gather selected items from both sidebar and chests




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
                      placeholder="Profilnavn"
                      className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                                className="px-3 py-1 text-sm rounded bg-neutral-800 text-white focus:outline-none ring-2 ring-inset ring-blue-500 min-w-[100px]"
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
              <SettingsDropdown
                onImport={handleImportProfile}
                onExport={handleExportProfile}
                onShare={handleShare}
                onCopyCode={handleCopyCode}
                onImportCode={handleImportCode}
                onNewProfile={createNewProfile}
                onLoadPreset={loadPreset}
                onUndo={handleUndo}
                onRedo={handleRedo}
                undoDisabled={undoStack.length === 0}
                redoDisabled={redoStack.length === 0}
              />
            </div>

            {/* Kister */}
            <div ref={gridContainerRef} className="grid-cols-auto-fit dark-theme overflow-x-hidden">
              <SortableContext items={displayChests.map(c => c.id)} strategy={rectSortingStrategy}>
                {displayChests.map((chest, index) => (
                  <ChestComponent
                    key={`${chest.id}-${profileVersion}`}
                    chest={chest}
                    index={globalChestOffset + index}
                    removeChest={confirmDeleteChest}
                    updateChestLabel={updateChestLabel}
                    updateChestIcon={updateChestIcon}
                    removeItemFromChest={removeItemFromChest}
                    gridView={chestGridView}
                    isPlaceholder={incomingChest?.id === chest.id}
                    selectedItems={selectedItems}
                    onItemSelect={handleItemSelect}
                  />
                ))}
              </SortableContext>

              {/* Add Chest Drop Zone */}
              <AddChestDropZone onAddChest={addChest} />
            </div>
          </main>
        </div>



        {modalVisible && (
          <ConfirmationModal
            onConfirm={() => handleDeleteChest(chestToDelete!)}
            onCancel={() => setModalVisible(false)}
            message="Er du sikker på, at du vil slette denne kiste? Den er ikke tom."
            title="Bekræft Sletning"
            variant="danger"
            confirmText="Slet"
            cancelText="Annuller"
          />
        )}

        {newProfileModalVisible && (
          <ConfirmationModal
            onConfirm={confirmNewProfile}
            onCancel={cancelNewProfile}
            message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
            title="Ny Profil"
            variant="warning"
            confirmText="Fortsæt"
            cancelText="Annuller"
          />
        )}

        {importProfileModalVisible && (
          <ConfirmationModal
            onConfirm={confirmImportProfile}
            onCancel={cancelImportProfile}
            message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
            title="Importer Profil"
            variant="warning"
            confirmText="Importer"
            cancelText="Annuller"
          />
        )}

        {deleteTabModalVisible && (
          <ConfirmationModal
            onConfirm={confirmDeleteTab}
            onCancel={cancelDeleteTab}
            message="Er du sikker på, at du vil slette dette tab? Det indeholder kister med indhold."
            title="Bekræft Tab Sletning"
            variant="danger"
            confirmText="Slet"
            cancelText="Annuller"
          />
        )}

        {presetModalVisible && (
          <ConfirmationModal
            onConfirm={confirmLoadPreset}
            onCancel={cancelLoadPreset}
            message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
            title="Indlæs Skabelon"
            variant="warning"
            confirmText="Indlæs"
            cancelText="Annuller"
          />
        )}

        {importCodeModalVisible && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-white mb-4">Importer Kode</h2>
              <p className="text-neutral-400 text-sm mb-4">
                Indsæt den kode du har modtaget fra en anden bruger herunder.
              </p>
              <textarea
                value={importCodeValue}
                onChange={(e) => setImportCodeValue(e.target.value)}
                placeholder="Indsæt kode her..."
                className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setImportCodeModalVisible(false);
                    setImportCodeValue('');
                  }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={processImportCode}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Importer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Only center items on cursor, not chests */}
      <DragOverlay
        modifiers={activeItem && !('items' in activeItem) ? [snapCenterToCursor] : []}
        dropAnimation={dragSourceIsItemRef.current ? null : dropAnimation}
      >
        {activeId ? (
          activeItem && 'items' in activeItem ? (
            // Chest Overlay - use global position with fixed height matching grid
            <div className="opacity-90 min-w-[350px] text-white dark-theme pointer-events-none" style={{ height: '280px' }}>
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
