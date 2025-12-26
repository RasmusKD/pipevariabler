import React from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import './scss/main.scss';

import ChestComponent from './ChestComponent';
import SpriteIcon from './SpriteIcon';

import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import ChestGrid from './components/ChestGrid';
import { AppStateProvider } from './context/AppStateProvider';
import {
  useDndDrag,
  useLayout,
  useSelection,
  useChestsContext,
  useView,
  useData
} from './context/AppContext';

import {
  AUTO_SCROLL_ACCELERATION,
  AUTO_SCROLL_THRESHOLD,
} from './constants';
import { Item, Chest } from './types';


const InnerApp: React.FC = () => {
  const {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    dropAnimation,
    dragSourceIsItemRef
  } = useDndDrag();

  const { tabScrollRef, listContainerRef, gridContainerRef } = useLayout();
  const { selectedItems } = useSelection(); // Used in Overlay
  const { globalChestOffset, incomingChest, sidebarCloneId, displayChests } = useChestsContext(); // Used in Overlay/Grid
  const { chestGridView } = useView();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={{
        enabled: true,
        acceleration: AUTO_SCROLL_ACCELERATION,
        threshold: { x: AUTO_SCROLL_THRESHOLD, y: AUTO_SCROLL_THRESHOLD },
      }}
    >
      <div className="flex flex-col min-h-screen overflow-x-hidden bg-neutral-950 text-white">
        <div className="flex flex-1 flex-col md:flex-row h-full min-h-0">
          {/* SIDEBAR */}
          <Sidebar />

          {/* MAIN */}
          <main className="flex-1 p-4 flex flex-col gap-4 overflow-x-hidden">
            {/* HEADER – Tabs, Chest Grid Toggle, Settings */}
            <TabBar />

            {/* Kister */}
            <ChestGrid />
          </main>
        </div>

        {/* Note: Modals are handling in AppStateProvider to have access to state context */}

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
                index={globalChestOffset + displayChests.findIndex(c => c.id === (activeItem as Chest).id)}
                removeChest={() => { }}
                updateChestLabel={() => { }}
                updateChestIcon={() => { }}
                removeItemFromChest={() => { }}
                gridView={chestGridView}
                sidebarCloneId={null}
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

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <InnerApp />
    </AppStateProvider>
  );
};

export default App;

