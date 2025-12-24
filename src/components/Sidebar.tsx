import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FaTimes, FaTh, FaBars, FaSearch } from 'react-icons/fa';
import ItemComponent from '../ItemComponent';
import { DraggableSource } from '../dnd/Draggable';
import { Item } from '../types';
import { useView, useSelection } from '../context/AppContext';

interface SidebarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    itemsToShow: Item[];
    chestItemsMap: Map<string, number[]>;
    handleChestClick: (chestId: number, itemName?: string) => void;
    listHeight: number;
    listContainerRef: React.RefObject<HTMLDivElement>;
}

const Sidebar: React.FC<SidebarProps> = ({
    searchTerm,
    setSearchTerm,
    itemsToShow,
    chestItemsMap,
    handleChestClick,
    listHeight,
    listContainerRef,
}) => {
    // Use context for view and selection state
    const { showAll, setShowAll, isGridView, setIsGridView } = useView();
    const { selectedItems, handleItemSelect } = useSelection();

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);
    const handleClearSearch = () => setSearchTerm('');

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

    return (
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
    );
};

export default memo(Sidebar);
