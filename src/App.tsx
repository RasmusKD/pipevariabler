import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import './scss/main.scss';
import pako from 'pako';
import { processItems, getAllItems } from './itemUtils';
import ChestComponent from './ChestComponent';
import SpriteIcon from './SpriteIcon';

import ConfirmationModal from './ConfirmationModal';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import ChestGrid from './components/ChestGrid';
import { AppProvider, AppContextType } from './context/AppContext';
import { useProfileManager } from './hooks/useProfileManager';
import { useDragController } from './hooks/useDragController';
import { useChests } from './hooks/useChests';

import { Item, Chest, Tab, Profile } from './types';
import {
  AUTO_SCROLL_ACCELERATION,
  AUTO_SCROLL_THRESHOLD,
  SIDEBAR_HEIGHT_OFFSET,
} from './constants';




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

  const [listHeight, setListHeight] = useState(window.innerHeight - SIDEBAR_HEIGHT_OFFSET);
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
    moveTab,
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
    const loadProfile = (profile: Profile) => {
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
    const sortedItems = getAllItems().sort((a, b) => a.item.localeCompare(b.item));
    setItems(sortedItems);
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




  const updateChests = useCallback((newChests: Chest[]) => {
    setTabs(prev => prev.map(tab => (tab.id === activeTabId ? { ...tab, chests: newChests } : tab)));
  }, [activeTabId]);

  // Chest CRUD operations
  const {
    addChest,
    handleDeleteChest,
    confirmDeleteChest,
    updateChestLabel,
    updateChestIcon,
    removeItemFromChest,
  } = useChests({
    chests,
    tabs,
    updateChests,
    getNextChestId,
    setUndoStack,
    setRedoStack,
    setModalVisible,
    setChestToDelete,
  });

  const filteredItems = useMemo(
    () => items.filter(item => item.item.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, '_'))),
    [items, searchTerm]
  );

  // Map item names to their chest locations with global sequential IDs across all tabs
  // Stores { chestId, displayIndex } so we can show correct number and navigate correctly
  const chestItemsMap = useMemo(() => {
    const map = new Map<string, { chestId: number; displayIndex: number }[]>();
    let globalIndex = 1;
    tabs.forEach(tab => {
      tab.chests.forEach(chest => {
        const currentDisplayIndex = globalIndex;
        chest.items.forEach(item => {
          if (!map.has(item.item)) map.set(item.item, []);
          // Store both chest.id for navigation AND displayIndex for visual display
          map.get(item.item)!.push({ chestId: chest.id, displayIndex: currentDisplayIndex });
        });
        globalIndex++;
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
          const chestElement = document.querySelector(`[data-chest-id="${chestId}"]`) as HTMLElement;
          if (chestElement) {
            // First, instantly scroll chest to top to ensure it's fully visible
            chestElement.scrollIntoView({ behavior: 'auto', block: 'start' });

            // Flash highlight effect
            chestElement.classList.add('ring-2', 'ring-inset', 'ring-blue-500');
            setTimeout(() => {
              chestElement.classList.remove('ring-2', 'ring-inset', 'ring-blue-500');
            }, 1500);

            // If itemName provided, scroll to that item WITHIN the chest
            if (itemName) {
              const itemInChest = chest.items.find(i => i.item === itemName);
              if (itemInChest) {
                setSelectedItems(new Set([itemInChest.uid]));
                // Scroll item into view within its container
                setTimeout(() => {
                  const itemElement = chestElement.querySelector(`[data-item-id="${itemInChest.uid}"]`) as HTMLElement;
                  if (itemElement) {
                    // Simple scrollIntoView - chest is already in view so this only scrolls within
                    itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }, 200);
                setTimeout(() => setSelectedItems(new Set()), 2000);
              }
            }
          }
        }, 150);
        return;
      }
    }
  }, [tabs, activeTabId]);


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




  // Build context value
  const appContextValue: AppContextType = useMemo(() => ({
    profile: {
      profileName,
      setProfileName,
      isEditingProfileName,
      setIsEditingProfileName,
    },
    tabs: {
      tabs,
      activeTabId,
      setActiveTabId,
      isEditingTabName,
      setIsEditingTabName,
      updateTabName,
      addTab,
      moveTab,
      removeTab,
    },
    settings: {
      onImport: handleImportProfile,
      onExport: handleExportProfile,
      onShare: handleShare,
      onCopyCode: handleCopyCode,
      onImportCode: handleImportCode,
      onNewProfile: createNewProfile,
      onLoadPreset: loadPreset,
      onUndo: handleUndo,
      onRedo: handleRedo,
      undoDisabled: undoStack.length === 0,
      redoDisabled: redoStack.length === 0,
    },
    view: {
      chestGridView,
      setChestGridView,
      isGridView,
      setIsGridView,
      showAll,
      setShowAll,
    },
    selection: {
      selectedItems,
      handleItemSelect,
    },
  }), [
    profileName, setProfileName, isEditingProfileName, setIsEditingProfileName,
    tabs, activeTabId, setActiveTabId, isEditingTabName, setIsEditingTabName, updateTabName, addTab, moveTab, removeTab,
    handleImportProfile, handleExportProfile, handleShare, handleCopyCode, handleImportCode, createNewProfile, loadPreset, handleUndo, handleRedo, undoStack.length, redoStack.length,
    chestGridView, setChestGridView, isGridView, setIsGridView, showAll, setShowAll,
    selectedItems, handleItemSelect,
  ]);

  return (
    <AppProvider value={appContextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        autoScroll={{
          enabled: true,
          acceleration: AUTO_SCROLL_ACCELERATION,
          threshold: { x: AUTO_SCROLL_THRESHOLD, y: AUTO_SCROLL_THRESHOLD },
        }}
      >
        <div className="flex flex-col min-h-screen overflow-x-hidden bg-neutral-950 text-white">
          <div className="flex flex-1 flex-col md:flex-row h-full min-h-0">
            {/* SIDEBAR */}
            <Sidebar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              itemsToShow={itemsToShow}
              chestItemsMap={chestItemsMap}
              handleChestClick={handleChestClick}
              listHeight={listHeight}
              listContainerRef={listContainerRef}
            />

            {/* MAIN */}
            <main className="flex-1 p-4 flex flex-col gap-4 overflow-x-hidden">
              {/* HEADER – Tabs, Chest Grid Toggle, Settings */}
              <TabBar tabScrollRef={tabScrollRef} />

              {/* Kister */}
              <ChestGrid
                displayChests={displayChests}
                profileVersion={profileVersion}
                globalChestOffset={globalChestOffset}
                incomingChest={incomingChest}
                gridContainerRef={gridContainerRef}
                confirmDeleteChest={confirmDeleteChest}
                updateChestLabel={updateChestLabel}
                updateChestIcon={updateChestIcon}
                removeItemFromChest={removeItemFromChest}
                addChest={addChest}
              />
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
    </AppProvider>
  );
};

export default App;

