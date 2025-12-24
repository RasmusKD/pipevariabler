import React, { memo } from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import ChestComponent from '../ChestComponent';
import AddChestDropZone from './AddChestDropZone';
import { Chest, Item } from '../types';
import { useView, useSelection } from '../context/AppContext';

interface ChestGridProps {
    displayChests: Chest[];
    profileVersion: number;
    globalChestOffset: number;
    incomingChest: Chest | null;
    gridContainerRef: React.RefObject<HTMLDivElement>;

    // Chest handlers
    confirmDeleteChest: (id: number) => void;
    updateChestLabel: (id: number, label: string) => void;
    updateChestIcon: (id: number, icon: string) => void;
    removeItemFromChest: (chestId: number, item: Item) => void;
    addChest: () => void;
}

const ChestGrid: React.FC<ChestGridProps> = ({
    displayChests,
    profileVersion,
    globalChestOffset,
    incomingChest,
    gridContainerRef,
    confirmDeleteChest,
    updateChestLabel,
    updateChestIcon,
    removeItemFromChest,
    addChest,
}) => {
    // Use context for view and selection state
    const { chestGridView } = useView();
    const { selectedItems, handleItemSelect } = useSelection();

    return (
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
    );
};

export default memo(ChestGrid);
