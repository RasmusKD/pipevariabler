import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Toggle from 'react-toggle';
import { FaCog, FaCaretDown, FaTimes, FaEdit } from 'react-icons/fa';
import { FixedSizeList as List } from 'react-window';
import './scss/main.scss';
import 'react-toggle/style.css';
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
}

interface Profile {
  name: string;
  chests: Chest[];
}

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [chests, setChests] = useState<Chest[]>(() => {
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      return profile.chests.map((chest: any) => ({
        ...chest,
        icon: chest.icon || 'barrel',
      }));
    }
    return [];
  });
  const [profileName, setProfileName] = useState<string>(() => {
    const savedProfile = localStorage.getItem('profile');
    return savedProfile ? JSON.parse(savedProfile).name : 'Ny Profil';
  });
  const [showAll, setShowAll] = useState<boolean>(() => {
    const savedShowAll = localStorage.getItem('showAll');
    return savedShowAll ? JSON.parse(savedShowAll) : true;
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [listHeight, setListHeight] = useState(window.innerHeight - 250);
  const [undoStack, setUndoStack] = useState<Chest[][]>([]);
  const [redoStack, setRedoStack] = useState<Chest[][]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newProfileModalVisible, setNewProfileModalVisible] = useState(false);
  const [importProfileModalVisible, setImportProfileModalVisible] = useState(false);
  const [chestToDelete, setChestToDelete] = useState<number | null>(null);
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

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
    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setChests(profile.chests.map((chest: any) => ({
        ...chest,
        icon: chest.icon || 'barrel',
      })));
      setProfileName(profile.name);
    }
  }, []);

  useEffect(() => {
    const profile: Profile = {
      name: profileName,
      chests,
    };
    localStorage.setItem('profile', JSON.stringify(profile));
  }, [chests, profileName]);

  useEffect(() => {
    localStorage.setItem('showAll', JSON.stringify(showAll));
  }, [showAll]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleToggleMode = useCallback(() => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('isDarkMode', JSON.stringify(newMode));
      return newMode;
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
    const profile: Profile = {
      name: profileName,
      chests,
    };
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profileName, chests]);

  const createNewProfile = useCallback(() => {
    if (chests.length > 0) {
      setNewProfileModalVisible(true);
    } else {
      setChests([]);
      setProfileName('Ny Profil');
      setShowAll(true);
    }
  }, [chests.length]);

  const confirmNewProfile = () => {
    setChests([]);
    setProfileName('Ny Profil');
    setShowAll(true);
    setNewProfileModalVisible(false);
  };

  const cancelNewProfile = () => {
    setNewProfileModalVisible(false);
  };

  const confirmImportProfile = () => {
    if (pendingProfile) {
      setChests(pendingProfile.chests.map((chest: any) => ({
        ...chest,
        icon: chest.icon || 'barrel',
      })));
      setProfileName(pendingProfile.name);
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

  const filteredItems = useMemo(
    () => items.filter(item => item.item.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, '_'))),
    [items, searchTerm]
  );

  const chestItemsMap = useMemo(() => {
    const map = new Map<string, number[]>();
    chests.forEach((chest, index) => {
      chest.items.forEach(item => {
        if (!map.has(item.item)) {
          map.set(item.item, []);
        }
        map.get(item.item)?.push(chest.id);
      });
    });
    return map;
  }, [chests]);

  const itemsToShow = useMemo(
    () => (showAll ? filteredItems : filteredItems.filter(item => !chestItemsMap.has(item.item))),
    [filteredItems, showAll, chestItemsMap]
  );

  const addChest = useCallback(() => {
    setUndoStack(prevStack => [...prevStack, chests]);
    setRedoStack([]);
    const newChestId = chests.length > 0 ? Math.max(...chests.map(chest => chest.id)) + 1 : 1;
    const newChest = { id: newChestId, label: 'Barrel', items: [], icon: 'barrel' };
    setChests(prevChests => [...prevChests, newChest]);
  }, [chests]);

  const handleDeleteChest = useCallback((id: number) => {
    setUndoStack(prevStack => [...prevStack, chests]);
    setRedoStack([]);
    setChests(chests.filter(chest => chest.id !== id).map((chest, index) => ({ ...chest, id: index + 1 })));
    setModalVisible(false);
  }, [chests]);

  const confirmDeleteChest = useCallback((id: number) => {
    const chestToRemove = chests.find(chest => chest.id === id);
    if (chestToRemove && chestToRemove.items.length > 0) {
      setChestToDelete(id);
      setModalVisible(true);
    } else {
      handleDeleteChest(id);
    }
  }, [chests, handleDeleteChest]);

  const updateChestLabel = useCallback((id: number, label: string) => {
    setChests(prevChests => prevChests.map(chest => (chest.id === id ? { ...chest, label } : chest)));
  }, []);

  const updateChestIcon = useCallback((id: number, icon: string) => {
    setChests(prevChests => prevChests.map(chest => (chest.id === id ? { ...chest, icon } : chest)));
  }, []);

  const removeItemFromChest = useCallback((chestId: number, item: Item) => {
    setUndoStack(prevStack => [...prevStack, chests]);
    setRedoStack([]);
    setChests(prevChests =>
      prevChests.map(chest => {
        if (chest.id === chestId) {
          return { ...chest, items: chest.items.filter(chestItem => chestItem.item !== item.item) };
        }
        return chest;
      })
    );
  }, [chests]);

  const handleDrop = useCallback(
    (item: Item, chestId: number) => {
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
        setUndoStack(prevStack => [...prevStack, chests]);
        setRedoStack([]);
        setChests(prevChests =>
          prevChests.map(chest => {
            if (chest.id === chestId) {
              if (!chest.items.some(chestItem => chestItem.item === item.item)) {
                return { ...chest, items: [...chest.items, item] };
              }
            }
            return chest;
          })
        );
      }
    },
    [chests, isDarkMode]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndoStack = [...undoStack];
      const previousState = newUndoStack.pop()!;
      setRedoStack(prevStack => [...prevStack, chests]);
      setChests(previousState);
      setUndoStack(newUndoStack);
    }
  }, [undoStack, chests]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextState = newRedoStack.pop()!;
      setUndoStack(prevStack => [...prevStack, chests]);
      setChests(nextState);
      setRedoStack(newRedoStack);
    }
  }, [redoStack, chests]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const renderRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
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
    return () => {
      window.removeEventListener('resize', updateHeights);
    };
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  const moveChest = (dragIndex: number, hoverIndex: number) => {
    setChests(prevChests => {
      const newChests = [...prevChests];
      const [movedChest] = newChests.splice(dragIndex, 1);
      newChests.splice(hoverIndex, 0, movedChest);

      return newChests.map((chest, idx) => ({ ...chest, id: idx + 1 }));
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
        <div className="flex flex-1 flex-col md:flex-row h-full">
          <aside className={`p-4 border-b md:border-r flex-shrink-0 gap-4 flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700 dark-theme' : 'bg-white border-gray-200 light-theme'}`}>
            <div className={`${isDarkMode ? 'logo-dark' : 'logo-light'}`}/>
            <div className="relative">
              <input
                type="text"
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
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={() => setShowAll(!showAll)}
                  className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                />
                <span>Vis alle</span>
              </label>
            </div>
            <div ref={listContainerRef} className="flex-1 overflow-auto">
              <List
                className={`${isDarkMode ? 'dark-theme' : 'light-theme'}`}
                height={listHeight}
                itemCount={itemsToShow.length}
                itemSize={50}
                width="100%"
              >
                {renderRow}
              </List>
            </div>
          </aside>
          <main className="flex-1 p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center h-8">
              <button className="bg-blue-500 hover:bg-blue-700 text-white px-2 rounded py-1 text-sm" onClick={addChest}>
                Tilføj kiste
              </button>
              <div className="flex items-center">
                {isEditingProfileName ? (
                  <>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className={`border p-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                      placeholder="Profilnavn"
                    />
                    <button className="text-blue-500 hover:text-blue-700 ml-2" onClick={() => setIsEditingProfileName(false)}>
                      Gem
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-center text-xl font-bold">{profileName}</span>
                    <button className="text-blue-500 hover:text-blue-700 ml-2" onClick={() => setIsEditingProfileName(true)}>
                      <FaEdit />
                    </button>
                  </>
                )}
              </div>
              <div className="relative z-50">
                <button
                  className={`flex items-center space-x-2 p-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-800 text-white' : 'bg-gray-400 hover:bg-gray-500 text-black'}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <FaCog />
                  <FaCaretDown />
                </button>
                {dropdownOpen && (
                  <div className={`absolute right-0 mt-2 w-48 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-black'} rounded shadow-lg`}>
                    <div className="p-2">
                      <button
                        className={`w-full text-left px-2 py-2 text-sm flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        onClick={handleToggleMode}
                      >
                        Dark Mode
                        <Toggle
                          checked={isDarkMode}
                          onChange={handleToggleMode}
                          className="ml-2"
                        />
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
                          <div
                            className="head-icon head-icon-1 cursor-pointer"
                            onClick={() => window.open('https://github.com/RasmusKD')}
                          />
                          <div className="label-container">
                            <div className="arrow-down"></div>
                            <div className={`py-2 rounded ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
                              <p className="font-bold">WhoToldYou</p>
                              <p className="text-sm">Udvikling af siden</p>
                            </div>
                          </div>
                        </div>
                        <div className="group">
                          <div className="head-icon head-icon-2" />
                          <div className="label-container">
                            <div className="arrow-down"></div>
                            <div className={`py-2 rounded ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200'}`}>
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
                />
              ))}
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
      </div>
    </DndProvider>
  );
};

export default App;
