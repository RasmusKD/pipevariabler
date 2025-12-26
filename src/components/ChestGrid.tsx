import React, { memo } from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import ChestComponent from '../ChestComponent';
import AddChestDropZone from './AddChestDropZone';
import { useView, useSelection, useChestsContext, useLayout, useSettings } from '../context/AppContext';

const ChestGrid: React.FC = () => {
    // Use context for view and selection state
    const { chestGridView } = useView();
    const { selectedItems, handleItemSelect } = useSelection();
    const {
        displayChests,
        globalChestOffset,
        incomingChest,
        addChest,
        confirmDeleteChest,
        updateChestLabel,
        updateChestIcon,
        removeItemFromChest,
        sidebarCloneId
    } = useChestsContext();
    const { gridContainerRef } = useLayout();
    const { profileVersion } = useSettings();

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
                        sidebarCloneId={sidebarCloneId}
                    />
                ))}
            </SortableContext>

            {/* Add Chest Drop Zone */}
            <AddChestDropZone onAddChest={addChest} />
        </div>
    );
};

export default memo(ChestGrid);
