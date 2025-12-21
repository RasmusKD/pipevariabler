import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaCog, FaCaretDown, FaTimes, FaEdit, FaPlus, FaTh, FaBars } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import './scss/main.scss';
import itemsData from './data.json';
import ItemComponent from './ItemComponent';
import ChestComponent from './ChestComponent';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from './ConfirmationModal';

interface Item { item: string; variable: string; image: string; }
interface Chest { id: number; label: string; items: Item[]; icon: string; checked: boolean; }
interface Tab { id: number; name: string; chests: Chest[]; }
interface Profile { name: string; tabs?: Tab[]; chests?: Chest[]; }

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

  const listContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]);
  const chests = useMemo(() => activeTab?.chests || [], [activeTab]);

  const getNextChestId = useCallback(() => {
    let maxId = 0;
    tabs.forEach(tab => tab.chests.forEach(chest => { if (chest.id > maxId) maxId = chest.id; }));
    return maxId + 1;
  }, [tabs]);

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

  const handleDrop = useCallback((item: Item, chestId: number) => {
    const chestIndex = (chests || []).findIndex(chest => chest.id === chestId);
    const command = `/signedit 3 ${[...(chests?.[chestIndex].items || []), item].map(i => i.variable).join(',')}`;
    if (command.length > 256) {
      toast.error('Du kan ikke tilføje mere til kisten – kommandoen vil overstige 256 tegn.', {
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
    } else {
      setUndoStack(prev => [...prev, tabs]);
      setRedoStack([]);
      const newChests = (chests || []).map(chest => {
        if (chest.id === chestId) {
          if (!chest.items.some(chestItem => chestItem.item === item.item)) {
            return { ...chest, items: [...chest.items, item] };
          }
        }
        return chest;
      });
      updateChests(newChests);
    }
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

  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = itemsToShow[index];
    const chestIds = chestItemsMap.get(item.item);
    return (
      <div style={style} key={item.item}>
        <ItemComponent
          item={item}
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
    const newChests = [...(chests || [])];
    const [movedChest] = newChests.splice(dragIndex, 1);
    newChests.splice(hoverIndex, 0, movedChest);
    updateChests(newChests);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col min-h-screen overflow-x-hidden bg-neutral-950 text-white">
        <div className="flex flex-1 flex-col md:flex-row h-full min-h-0">
          {/* SIDEBAR */}
          <aside className="p-4 border-b md:border-r flex-shrink-0 gap-4 flex flex-col bg-neutral-900 border-neutral-800 dark-theme">
            <div className="logo-dark" />
            <div className="relative">
              <input
                type="text"
                spellCheck="false"
                value={searchTerm}
                placeholder="Søg..."
                className="border p-2 pr-10 w-full bg-neutral-800 border-neutral-700 text-white"
                onChange={handleSearch}
              />
              {searchTerm && (
                <button
                  className="absolute right-0 top-0 mt-3 mr-3 text-neutral-400 hover:text-neutral-200"
                  onClick={handleClearSearch}
                  aria-label="Ryd søgning"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Item-liste header + toggles */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Item liste</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={() => setShowAll(!showAll)}
                    className="form-checkbox h-4 w-4"
                  />
                  <span>Vis alle</span>
                </label>

                {/* KVADRATISK item-liste grid toggle */}
                <button
                  onClick={() => setIsGridView(!isGridView)}
                  className="inline-flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 transition-colors h-8 w-8 leading-none"
                  title={isGridView ? 'Item-liste: Listevisning' : 'Item-liste: Gittervisning'}
                  aria-pressed={isGridView}
                >
                  {isGridView ? <FaBars size={16} /> : <FaTh size={16} />}
                </button>
              </div>
            </div>

            <div ref={listContainerRef} className="flex-1 overflow-auto dark-theme overflow-x-hidden">
              {isGridView ? (
                <div className="h-full" style={{ height: listHeight }}>
                  <div className="grid grid-cols-6 gap-2">
                    {itemsToShow.map((item, index) => (
                      <ItemComponent
                        key={item.item}
                        item={item}
                        index={index}
                        lastIndex={itemsToShow.length - 1}
                        chestIds={chestItemsMap.get(item.item)}
                        isGridView
                      />
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
                      className="border p-2 bg-neutral-800 border-neutral-700 text-white"
                      placeholder="Profilnavn"
                    />
                    <button className="text-blue-400 hover:text-blue-300" onClick={() => setIsEditingProfileName(false)}>Gem</button>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold">{profileName}</span>
                    <button className="text-blue-400 hover:text-blue-300" onClick={() => setIsEditingProfileName(true)} aria-label="Rediger profilnavn">
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
                  {tabs.map((tab) => (
                    <div key={tab.id} className="flex items-center flex-shrink-0">
                      {isEditingTabName === tab.id ? (
                        <input
                          type="text"
                          spellCheck="false"
                          value={tab.name}
                          onChange={(e) => updateTabName(tab.id, e.target.value)}
                          onBlur={() => setIsEditingTabName(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingTabName(null); }}
                          className="px-3 py-1 text-sm border rounded w-32 bg-neutral-800 border-neutral-700 text-white"
                          autoFocus
                        />
                      ) : (
                        <button
                          id={`tab-btn-${tab.id}`}
                          type="button"
                          className={`flex-shrink-0 px-3 py-1 text-sm rounded border-b-2 transition-colors flex items-center gap-1 max-w-40 ${activeTabId === tab.id
                            ? 'bg-neutral-800 border-blue-400 text-white'
                            : 'bg-neutral-900 border-transparent text-neutral-300 hover:text-white hover:bg-neutral-800'
                            }`}
                          onClick={() => setActiveTabId(tab.id)}
                          onDoubleClick={() => setIsEditingTabName(tab.id)}
                        >
                          <span className="truncate block max-w-28">{tab.name}</span>
                          {tabs.length > 1 && (
                            <span
                              className="text-red-500 hover:text-red-600 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                              title="Luk tab"
                            >
                              <FaTimes size={10} />
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
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
                  className="inline-flex items-center justify-center rounded bg-neutral-800 hover:bg-neutral-700 transition-colors h-8 w-8 leading-none"
                  title={chestGridView ? 'Kister: Listevisning' : 'Kister: Gittervisning'}
                  aria-pressed={chestGridView}
                >
                  {chestGridView ? <FaBars size={16} /> : <FaTh size={16} />}
                </button>
              </div>

              {/* Settings */}
              <div className="relative z-50">
                <button
                  className="flex items-center space-x-2 p-2 rounded bg-neutral-800 hover:bg-neutral-900"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <FaCog />
                  <FaCaretDown />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 text-white rounded shadow-lg">
                    <div className="p-2">
                      <button
                        className="w-full text-left px-2 py-2 text-sm hover:bg-neutral-800"
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
                        className="w-full text-left px-2 py-2 text-sm hover:bg-neutral-800"
                        onClick={handleExportProfile}
                      >
                        Eksporter Profil
                      </button>
                      <button
                        className="w-full text-left px-2 py-2 text-sm hover:bg-neutral-800"
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
              {chests.map((chest, index) => (
                <ChestComponent
                  key={chest.id}
                  chest={chest}
                  index={index}
                  onDrop={handleDrop}
                  removeChest={confirmDeleteChest}
                  updateChestLabel={updateChestLabel}
                  updateChestIcon={updateChestIcon}
                  removeItemFromChest={removeItemFromChest}
                  moveChest={moveChest}
                  gridView={chestGridView}
                />
              ))}

              {/* Add Chest */}
              <div className="flex items-center justify-center border-2 border-dashed rounded p-4 min-h-[200px] border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900 transition-colors">
                <button
                  onClick={addChest}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <FaPlus size={24} />
                  <span className="text-lg font-medium">Tilføj kiste</span>
                </button>
              </div>
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
    </DndProvider>
  );
};

export default App;
