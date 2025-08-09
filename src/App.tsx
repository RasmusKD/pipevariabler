import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaCog, FaCaretDown, FaTimes, FaEdit, FaPlus } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import './scss/main.scss';
import itemsData from './data.json';
import ItemComponent from './ItemComponent';
import ChestComponent from './ChestComponent';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from './ConfirmationModal';

interface Item {
  item: string;
  variable: string;
  image: string;
}

interface Chest {
  id: number;
  label: string;
  items: Item[];
  icon: string;
  checked: boolean;
}

interface Tab {
  id: number;
  name: string;
  chests: Chest[];
}

interface Profile {
  name: string;
  tabs?: Tab[];
  chests?: Chest[];
}

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [showAll, setShowAll] = useState<boolean>(() => {
    const savedShowAll = localStorage.getItem('showAll');
    return savedShowAll ? JSON.parse(savedShowAll) : true;
  });
  const [isGridView, setIsGridView] = useState<boolean>(() => {
    const savedGridView = localStorage.getItem('isGridView');
    return savedGridView ? JSON.parse(savedGridView) : false;
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

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

  const listContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Horisontal tab-scroll
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]);
  const chests = useMemo(() => activeTab?.chests || [], [activeTab]);

  const getNextChestId = useCallback(() => {
    let maxId = 0;
    tabs.forEach(tab => {
      tab.chests.forEach(chest => {
        if (chest.id > maxId) maxId = chest.id;
      });
    });
    return maxId + 1;
  }, [tabs]);

  // Init profil og tabs
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
    setItems(sortedItems);
  }, []);

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      setIsDarkMode(isDark);
      localStorage.setItem('isDarkMode', JSON.stringify(isDark));
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handler);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handler);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (tabs.length > 0 && profileName) {
      const profile: Profile = { name: profileName, tabs };
      localStorage.setItem('profile', JSON.stringify(profile));
    }
  }, [tabs, profileName]);

  useEffect(() => {
    localStorage.setItem('showAll', JSON.stringify(showAll));
  }, [showAll]);

  useEffect(() => {
    localStorage.setItem('isGridView', JSON.stringify(isGridView));
  }, [isGridView]);

  // Hold aktivt tab i view
  useEffect(() => {
    const el = document.getElementById(`tab-btn-${activeTabId}`);
    const scroller = tabScrollRef.current;
    if (!el || !scroller) return;

    const elLeft = (el as HTMLElement).offsetLeft;
    const elRight = elLeft + (el as HTMLElement).offsetWidth;
    const visibleLeft = scroller.scrollLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;

    if (elLeft < visibleLeft) {
      scroller.scrollTo({ left: elLeft - 16, behavior: 'smooth' });
    } else if (elRight > visibleRight) {
      scroller.scrollTo({ left: elRight - scroller.clientWidth + 16, behavior: 'smooth' });
    }
  }, [activeTabId]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);

  const handleToggleMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('isDarkMode', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleImportProfile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const profile = JSON.parse(fileReader.result as string);
      setPendingProfile(profile);
      setImportProfileModalVisible(true);
    };
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0]);
    }
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
    if (pendingProfile) {
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
        progress: undefined,
        theme: isDarkMode ? 'dark' : 'light',
        transition: Zoom,
        closeButton: false,
      });
    }
  };

  const cancelImportProfile = () => {
    setPendingProfile(null);
    setImportProfileModalVisible(false);
  };

  // Tab-funktioner
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
  const cancelDeleteTab = () => {
    setTabToDelete(null);
    setDeleteTabModalVisible(false);
  };

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

  const chestItemsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    tabs.forEach(tab => {
      tab.chests.forEach(chest => {
        chest.items.forEach(item => {
          if (!map.has(item.item)) map.set(item.item, []);
          map.get(item.item)!.push(chest.id);
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
    updateChests([...chests, newChest]);
  }, [chests, tabs, updateChests, getNextChestId]);

  const handleDeleteChest = useCallback((id: number) => {
    setUndoStack(prev => [...prev, tabs]);
    setRedoStack([]);
    const newChests = chests.filter(chest => chest.id !== id);
    updateChests(newChests);
    setModalVisible(false);
  }, [chests, tabs, updateChests]);

  const confirmDeleteChest = useCallback((id: number) => {
    const toRemove = chests.find(chest => chest.id === id);
    if (toRemove && toRemove.items.length > 0) {
      setChestToDelete(id);
      setModalVisible(true);
    } else {
      handleDeleteChest(id);
    }
  }, [chests, handleDeleteChest]);

  const updateChestLabel = useCallback((id: number, label: string) => {
    const newChests = chests.map(chest => (chest.id === id ? { ...chest, label } : chest));
    updateChests(newChests);
  }, [chests, updateChests]);

  const updateChestIcon = useCallback((id: number, icon: string) => {
    const newChests = chests.map(chest => (chest.id === id ? { ...chest, icon } : chest));
    updateChests(newChests);
  }, [chests, updateChests]);

  const removeItemFromChest = useCallback((chestId: number, item: Item) => {
    setUndoStack(prev => [...prev, tabs]);
    setRedoStack([]);
    const newChests = chests.map(chest => {
      if (chest.id === chestId) {
        return { ...chest, items: chest.items.filter(chestItem => chestItem.item !== item.item) };
      }
      return chest;
    });
    updateChests(newChests);
  }, [chests, tabs, updateChests]);

  const handleDrop = useCallback((item: Item, chestId: number) => {
    const chestIndex = chests.findIndex(chest => chest.id === chestId);
    const command = `/signedit 3 ${[...chests[chestIndex].items, item].map(i => i.variable).join(',')}`;
    if (command.length > 256) {
      toast.error('Du kan ikke tilføje mere til kisten kommandoen vil overstige 256 tegn.', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
        theme: isDarkMode ? 'dark' : 'light',
        transition: Zoom,
        closeButton: false,
      });
    } else {
      setUndoStack(prev => [...prev, tabs]);
      setRedoStack([]);
      const newChests = chests.map(chest => {
        if (chest.id === chestId) {
          if (!chest.items.some(chestItem => chestItem.item === item.item)) {
            return { ...chest, items: [...chest.items, item] };
          }
        }
        return chest;
      });
      updateChests(newChests);
    }
  }, [chests, isDarkMode, tabs, updateChests]);

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

  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = itemsToShow[index];
    const chestIds = chestItemsMap.get(item.item);
    return (
        <div style={style} key={item.item}>
          <ItemComponent
              item={item}
              isDarkMode={isDarkMode}
              index={index}
              lastIndex={itemsToShow.length - 1}
              chestIds={chestIds}
              isGridView={false}
          />
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

  const onTabWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Convert vertical wheel to horizontal scroll inside the tab strip
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
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

  const moveChest = (dragIndex: number, hoverIndex: number) => {
    const newChests = [...chests];
    const [movedChest] = newChests.splice(dragIndex, 1);
    newChests.splice(hoverIndex, 0, movedChest);
    updateChests(newChests);
  };

  return (
      <DndProvider backend={HTML5Backend}>
        <div className={`flex flex-col min-h-screen overflow-x-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
          <div className="flex flex-1 flex-col md:flex-row h-full min-h-0">
            <aside className={`p-4 border-b md:border-r flex-shrink-0 gap-4 flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700 dark-theme' : 'bg-white border-gray-200 light-theme'}`}>
              <div className={`${isDarkMode ? 'logo-dark' : 'logo-light'}`} />
              <div className="relative">
                <input
                    type="text"
                    spellCheck="false"
                    value={searchTerm}
                    placeholder="Søg..."
                    className={`border p-2 pr-10 w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                    onChange={handleSearch}
                />
                {searchTerm && (
                    <button
                        className="absolute right-0 top-0 mt-3 mr-3 text-gray-500 hover:text-gray-800"
                        onClick={handleClearSearch}
                    >
                      <FaTimes />
                    </button>
                )}
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Item liste</h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showAll}
                        onChange={() => setShowAll(!showAll)}
                        className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                    />
                    <span>Vis alle</span>
                  </label>
                  <button
                      onClick={() => setIsGridView(!isGridView)}
                      className={`p-2 rounded transition-colors ${
                          isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'
                      }`}
                      title={isGridView ? 'Skift til liste visning' : 'Skift til gitter visning'}
                  >
                    {isGridView ? '☰' : '⊞'}
                  </button>
                </div>
              </div>
              <div ref={listContainerRef} className={`flex-1 overflow-auto ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                {isGridView ? (
                    <div className={`h-full ${isDarkMode ? 'dark-theme' : 'light-theme'}`} style={{ height: listHeight }}>
                      <div className="grid grid-cols-6 gap-2 overflow-y-auto">
                        {itemsToShow.map((item, index) => (
                            <ItemComponent
                                key={item.item}
                                item={item}
                                isDarkMode={isDarkMode}
                                index={index}
                                lastIndex={itemsToShow.length - 1}
                                chestIds={chestItemsMap.get(item.item)}
                                isGridView={true}
                            />
                        ))}
                      </div>
                    </div>
                ) : (
                    <List
                        className={`${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                        height={listHeight}
                        itemCount={itemsToShow.length}
                        itemSize={50}
                        width="100%"
                    >
                      {renderRow}
                    </List>
                )}
              </div>
            </aside>

            <main className="flex-1 p-4 flex flex-col gap-4">
              {/* HEADER – Fixed layout with CSS Grid */}
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 h-8 w-full">
                {/* Left: Profile name section */}
                <div className="flex items-center gap-2">
                  {isEditingProfileName ? (
                      <>
                        <input
                            type="text"
                            spellCheck="false"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className={`border p-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                            placeholder="Profilnavn"
                        />
                        <button
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => setIsEditingProfileName(false)}
                        >
                          Gem
                        </button>
                      </>
                  ) : (
                      <>
                        <span className="text-xl font-bold">{profileName}</span>
                        <button
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => setIsEditingProfileName(true)}
                        >
                          <FaEdit/>
                        </button>
                      </>
                  )}
                </div>

                {/* Middle: Tab bar - constrained by grid */}
                <div className="min-w-0 overflow-hidden">
                  <div
                      ref={tabScrollRef}
                      onWheel={onTabWheel}
                      className={`flex items-center gap-2 overflow-x-auto overflow-y-hidden ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                      style={{
                        maxWidth: '100%',
                        width: '100%'
                      }}
                  >
                    {tabs.map((tab) => (
                        <div key={tab.id} className="flex items-center flex-shrink-0">
                          {isEditingTabName === tab.id ? (
                              <input
                                  type="text"
                                  spellCheck="false"
                                  value={tab.name}
                                  onChange={(e) => updateTabName(tab.id, e.target.value)}
                                  onBlur={() => setIsEditingTabName(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingTabName(null);
                                  }}
                                  className={`px-3 py-1 text-sm border rounded w-32 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                  autoFocus
                              />
                          ) : (
                              <button
                                  id={`tab-btn-${tab.id}`}
                                  type="button"
                                  className={`flex-shrink-0 px-3 py-1 text-sm rounded border-b-2 transition-colors flex items-center gap-1 max-w-40 ${
                                      activeTabId === tab.id
                                          ? (isDarkMode ? 'bg-gray-700 border-blue-400 text-white' : 'bg-white border-blue-500 text-black')
                                          : (isDarkMode ? 'bg-gray-800 border-transparent text-gray-300 hover:text-white hover:bg-gray-700'
                                              : 'bg-gray-100 border-transparent text-gray-600 hover:text-black hover:bg-gray-200')
                                  }`}
                                  onClick={() => setActiveTabId(tab.id)}
                                  onDoubleClick={() => setIsEditingTabName(tab.id)}
                              >
                                <span className="truncate block max-w-28">{tab.name}</span>
                                {/* Remove button inside tab */}
                                {tabs.length > 1 && (
                                    <span
                                        className="text-red-500 hover:text-red-700 flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeTab(tab.id);
                                        }}
                                        title="Luk tab"
                                    >
                                      <FaTimes size={10}/>
                                    </span>
                                )}
                              </button>
                          )}
                        </div>
                    ))}
                    <button
                        type="button"
                        className={`flex-shrink-0 px-2 py-1 text-sm rounded border-2 border-dashed transition-colors ${
                            isDarkMode
                                ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white'
                                : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-black'
                        }`}
                        onClick={addTab}
                        title="Tilføj nyt tab"
                    >
                      <FaPlus size={12}/>
                    </button>
                  </div>
                </div>

                {/* Right: Settings button */}
                <div className="relative z-50">
                  <button
                      className={`flex items-center space-x-2 p-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-400 hover:bg-gray-500 text-black'}`}
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <FaCog/>
                    <FaCaretDown/>
                  </button>
                  {dropdownOpen && (
                      <div
                          className={`absolute right-0 mt-2 w-48 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'} rounded shadow-lg`}>
                        <div className="p-2">
                          <button
                              className={`w-full text-left px-2 py-2 text-sm flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              onClick={handleToggleMode}
                          >
                            Dark Mode
                            <span
                                className={`ml-2 px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-green-600 text-white' : 'bg-gray-300 text-black'}`}>
                          {isDarkMode ? 'ON' : 'OFF'}
                        </span>
                          </button>
                          <button
                              className={`w-full text-left px-2 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
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
                              className={`w-full text-left px-2 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              onClick={handleExportProfile}
                          >
                            Eksporter Profil
                          </button>
                          <button
                              className={`w-full text-left px-2 py-2 text-sm ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              onClick={createNewProfile}
                          >
                            Ny Profil
                          </button>
                          <div className="border-t border-dashed my-2"></div>
                          <div className="flex gap-2 p-2">
                            <div className="group">
                              <div className="head-icon head-icon-1 cursor-pointer"
                                   onClick={() => window.open('https://github.com/RasmusKD')}/>
                              <div className="label-container">
                                <div className="arrow-down"></div>
                                <div
                                    className={`py-2 rounded ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
                                  <p className="font-bold">WhoToldYou</p>
                                  <p className="text-sm">Udvikling af siden</p>
                                </div>
                              </div>
                            </div>
                            <div className="group">
                              <div className="head-icon head-icon-2"/>
                              <div className="label-container">
                                <div className="arrow-down"></div>
                                <div
                                    className={`py-2 rounded ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
                                  <p className="font-bold">Iver</p>
                                  <p className="text-sm">Idé & Basis Design</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>

              <div ref={gridContainerRef} className={`grid-cols-auto-fit ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
                {chests.map((chest, index) => (
                    <ChestComponent
                        key={chest.id}
                        chest={chest}
                        index={index}
                        onDrop={handleDrop}
                        isDarkMode={isDarkMode}
                        removeChest={confirmDeleteChest}
                        updateChestLabel={updateChestLabel}
                        updateChestIcon={updateChestIcon}
                        removeItemFromChest={removeItemFromChest}
                        moveChest={moveChest}
                        setChests={updateChests}
                    />
                ))}

                {/* Add Chest */}
                <div
                    className={`flex items-center justify-center border-2 border-dashed rounded p-4 min-h-[200px] transition-colors ${
                        isDarkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                >
                  <button
                      onClick={addChest}
                      className={`flex flex-col items-center gap-3 p-6 rounded-lg transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                              : 'text-gray-500 hover:text-black hover:bg-gray-100'
                      }`}
                  >
                    <FaPlus size={24}/>
                    <span className="text-lg font-medium">Tilføj kiste</span>
                  </button>
                </div>
              </div>
            </main>
          </div>

          <ToastContainer
              className="toast-container"
              position="top-center"
              autoClose={3000}
              limit={1}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss={false}
              pauseOnHover={false}
              theme="dark"
          />

          {modalVisible && (
              <ConfirmationModal
                  isDarkMode={isDarkMode}
                  onConfirm={() => handleDeleteChest(chestToDelete!)}
                  onCancel={() => setModalVisible(false)}
                  message="Er du sikker på, at du vil slette denne kiste? Den er ikke tom."
                  title="Bekræft Sletning"
              />
          )}
          {newProfileModalVisible && (
              <ConfirmationModal
                  isDarkMode={isDarkMode}
                  onConfirm={confirmNewProfile}
                  onCancel={cancelNewProfile}
                  message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
                  title="Ny Profil"
              />
          )}
          {importProfileModalVisible && (
              <ConfirmationModal
                  isDarkMode={isDarkMode}
                  onConfirm={confirmImportProfile}
                  onCancel={cancelImportProfile}
                  message="Har du husket at eksportere den nuværende profil? Ændringer kan gå tabt, hvis du fortsætter uden at gemme."
                  title="Importer Profil"
              />
          )}
          {deleteTabModalVisible && (
              <ConfirmationModal
                  isDarkMode={isDarkMode}
                  onConfirm={confirmDeleteTab}
                  onCancel={cancelDeleteTab}
                  message="Er du sikker på, at du vil slette dette tab? Det indeholder kister med indhold."
                  title="Bekræft Tab Sletning"
              />
          )}
        </div>
      </DndProvider>
  );
};

export default App;