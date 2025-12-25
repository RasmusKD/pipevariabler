import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import ItemComponent from './ItemComponent';
import { FaEdit, FaTimes, FaRegCopy, FaCheckSquare, FaRegSquare, FaCheck } from 'react-icons/fa';
import { CMD_LIMIT, buildCommand } from './chestUtils';
import ChestIconPicker from './components/ChestIconPicker';
import { SortableItem } from './dnd/SortableItem';
import { Item, Chest } from './types';
import { COPY_FEEDBACK_DURATION } from './constants';

interface ChestComponentProps {
  chest: Chest;
  index: number;
  removeChest: (id: number) => void;
  updateChestLabel: (id: number, label: string) => void;
  updateChestIcon: (id: number, icon: string) => void;
  removeItemFromChest: (chestId: number, item: Item) => void;
  gridView: boolean;
  isPlaceholder?: boolean;
  selectedItems?: Set<string>;
  onItemSelect?: (uid: string, ctrlKey: boolean, isClick?: boolean) => void;
}

// Drop zone component for items inside a chest (no visual highlight - outer chest handles that)
const ItemsDropZone: React.FC<{
  chestId: number;
  children: React.ReactNode;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  hasItems: boolean;
  isGridView: boolean;
}> = memo(({ chestId, children, containerRef, hasItems, isGridView }) => {
  const { active } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: `chest-drop-${chestId}`,
    data: { chestId },
  });

  // Disable hover effects on items when dragging
  const isDragging = !!active;

  // Combine refs
  const handleRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (containerRef && 'current' in containerRef) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div
      ref={handleRef}
      className={`mt-3 p-2 w-full flex-1 rounded-lg bg-neutral-900/50 border-2 transition-colors ${hasItems
        ? 'border-transparent'
        : 'border-dashed border-neutral-700'
        }`}
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div style={{ pointerEvents: isDragging ? 'none' : 'auto', height: '100%' }}>
        {children}
      </div>
    </div>
  );
});


const ChestComponent: React.FC<ChestComponentProps> = memo(({
  chest,
  index,
  removeChest,
  updateChestLabel,
  updateChestIcon,
  removeItemFromChest,
  gridView,
  isPlaceholder,
  selectedItems,
  onItemSelect,
}) => {
  const { over, active } = useDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isPlaceholder ? 0.3 : 1,
    pointerEvents: isPlaceholder ? 'none' as const : 'auto' as const,
    height: '100%' as const,
  };


  // Highlight if dragging an item over this chest or the drop zone or any item inside
  const isDraggingItem = active && typeof active.id === 'string';
  const isOverChestDirectly = over?.id === chest.id;
  const isOverDropZone = over?.id === `chest-drop-${chest.id}`;

  // Check if hovering over an item that belongs to this chest
  const overIdStr = over?.id ? String(over.id) : '';
  const isOverItemInThisChest = chest.items.some(item =>
    (item.uid && item.uid === overIdStr) || item.item === overIdStr ||
    overIdStr === `item-drop-${item.uid}` // Also check for item-drop- prefix
  );

  const isOver = !!(isDraggingItem && (isOverChestDirectly || isOverDropZone || isOverItemInThisChest));

  // Detect if we're dragging an external item (from sidebar or another chest) over this chest
  const incomingItem = useMemo(() => {
    if (!isOver || !active || typeof active.id !== 'string') return null;
    const activeId = String(active.id);
    // Check if this item is NOT already in this chest
    if (chest.items.some(i => i.uid === activeId)) return null;
    // Create a placeholder item for the incoming external item
    return {
      uid: activeId,
      item: activeId, // Will be replaced with actual item name on drop
      variable: activeId,
      isPlaceholder: true
    } as Item & { isPlaceholder: boolean };
  }, [isOver, active, chest.items]);

  // Calculate target insert position based on what's being hovered
  const targetInsertIndex = useMemo(() => {
    if (!incomingItem || !over) return chest.items.length;

    const overId = String(over.id);

    // Check if hovering over a specific item (direct or via item-drop prefix)
    let targetItemId: string | null = null;
    if (overId.startsWith('item-drop-')) {
      targetItemId = overId.replace('item-drop-', '');
    } else if (chest.items.some(i => i.uid === overId)) {
      targetItemId = overId;
    }

    if (targetItemId) {
      const index = chest.items.findIndex(i => i.uid === targetItemId);
      if (index !== -1) return index;
    }

    // Default to end
    return chest.items.length;
  }, [incomingItem, over, chest.items]);

  // Display items includes placeholder for incoming external item at target position
  const displayItems = useMemo(() => {
    if (!incomingItem) return chest.items;
    // Insert the incoming item at the target position
    const result = [...chest.items];
    result.splice(targetInsertIndex, 0, incomingItem);
    return result;
  }, [chest.items, incomingItem, targetInsertIndex]);

  // Calculate sortable item IDs from displayItems
  const sortableItemIds = useMemo(() => {
    return displayItems.map(i => i.uid);
  }, [displayItems]);


  const [isChecked, setIsChecked] = useState<boolean>(chest.checked);
  const [isEditing, setIsEditing] = useState(false);
  const [chestLabel, setChestLabel] = useState(chest.label || 'Barrel');

  // Ref for scrolling to new items
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsCountRef = useRef(chest.items.length);

  const [copied, setCopied] = useState(false);

  // Sync checked state with props
  useEffect(() => {
    setIsChecked(chest.checked);
  }, [chest.checked]);

  // Scroll to bottom when new items are added (not on initial mount)
  const hasMountedRef = useRef(false);
  useEffect(() => {
    // Skip first render (initial mount or import)
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevItemsCountRef.current = chest.items.length;
      return;
    }

    // Only scroll if items were added (not removed or same)
    if (chest.items.length > prevItemsCountRef.current && itemsContainerRef.current) {
      itemsContainerRef.current.scrollTo({
        top: itemsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    prevItemsCountRef.current = chest.items.length;
  }, [chest.items.length]);

  // Sync title when chest changes
  useEffect(() => {
    setChestLabel(chest.label || 'Barrel');
  }, [chest.label]);

  const handleSave = () => {
    if (chestLabel.trim()) {
      updateChestLabel(chest.id, chestLabel);
      setIsEditing(false);
    }
  };

  const handleDoneToggle = () => {
    const newState = !isChecked;
    setIsChecked(newState);
    localStorage.setItem(`chest-checked-${chest.id}`, JSON.stringify(newState));
  };


  const command = useMemo(() => buildCommand(chest.items), [chest.items]);
  const cmdLength = command.length;
  const pct = Math.min(100, Math.round((cmdLength / CMD_LIMIT) * 100));
  const overLimit = cmdLength > CMD_LIMIT;

  // Render
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-chest-id={chest.id}
      className={`relative flex flex-col border rounded-2xl bg-neutral-900/80 border-neutral-800 p-3 shadow-sm hover:shadow-md transition ${isOver ? 'ring-2 ring-inset ring-blue-500 border-transparent' : ''}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 cursor-grab active:cursor-grabbing border-b border-neutral-800/50"
        {...attributes}
        {...listeners}
      >
        {/* Icon button */}

        <ChestIconPicker
          chestId={chest.id}
          currentIcon={chest.icon}
          updateChestIcon={updateChestIcon}
        />
        {/* Title Area */}
        <div className="group flex-1 min-w-0 text-left flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <input
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 flex-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                spellCheck={false}
                value={chestLabel}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                onChange={(e) => setChestLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                autoFocus
              />
              <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium" onClick={(e) => { e.stopPropagation(); handleSave(); }} onPointerDown={e => e.stopPropagation()} aria-label="Gem navn">
                Gem
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="truncate text-base font-semibold cursor-pointer"
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                onPointerDown={(e) => e.stopPropagation()}
              >{chest.label || 'Barrel'}</span>
              <button className="text-blue-400 hover:text-blue-300 transition-colors" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} onPointerDown={e => e.stopPropagation()} aria-label="Rediger navn">
                <FaEdit />
              </button>
            </div>
          )}
        </div>

        {/* Right actions */}
        {!isEditing && (
          <div className="flex items-center gap-2 text-base">
            {/* Done toggle */}
            <button onClick={(e) => { e.stopPropagation(); handleDoneToggle(); }} onPointerDown={e => e.stopPropagation()} className={`transition-colors ${isChecked ? 'text-green-400 hover:text-green-300' : 'text-neutral-400 hover:text-neutral-200'}`} title={isChecked ? 'Markér som færdig' : 'Markér som ufærdig'}>
              {isChecked ? <FaCheckSquare /> : <FaRegSquare />}
            </button>

            {/* Copy command */}
            {chest.items.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(command);
                  setCopied(true);
                  setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
                }}
                onPointerDown={e => e.stopPropagation()}
                className={`transition-colors ${copied ? 'text-green-400' : 'text-green-500 hover:text-green-400'}`}
                title="Kopiér kommando"
              >
                {copied ? <FaCheck /> : <FaRegCopy />}
              </button>
            )}

            {/* Delete chest */}
            <button onClick={(e) => { e.stopPropagation(); removeChest(chest.id); }} onPointerDown={e => e.stopPropagation()} className="text-red-500 hover:text-red-400 transition-colors" title="Slet kiste">
              <FaTimes />
            </button>
          </div>
        )}

        {/* Position number */}
        <div className="absolute top-1 right-2 text-[11px] text-neutral-400 select-none">#{index + 1}</div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2">
        <div className="h-1.5 rounded bg-neutral-800 overflow-hidden">
          <div
            className={`h-full ${overLimit ? 'bg-red-600' : pct > 85 ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%`, transition: 'width 150ms ease-out' }}
          />
        </div>
        <div className="mt-1 text-[12px] text-neutral-400">
          {cmdLength}/{CMD_LIMIT} tegn {overLimit && <span className="text-red-500 ml-1">– for langt!</span>}
        </div>
      </div>

      {/* Items Drop Zone */}
      <ItemsDropZone chestId={chest.id} containerRef={itemsContainerRef} hasItems={displayItems.length > 0} isGridView={gridView}>
        {displayItems.length > 0 ? (
          <SortableContext items={sortableItemIds} strategy={gridView ? rectSortingStrategy : verticalListSortingStrategy}>
            {gridView ? (
              <div className="grid grid-cols-6 gap-2">
                {displayItems.map((item, itemIndex) => {
                  const isPlaceholder = 'isPlaceholder' in item && item.isPlaceholder;
                  return (
                    <SortableItem
                      key={item.uid || `${item.item}-${itemIndex}`}
                      id={item.uid || item.item}
                      style={{ opacity: isPlaceholder ? 0.3 : 1, pointerEvents: isPlaceholder ? 'none' : 'auto' }}
                    >
                      {!isPlaceholder && (
                        <ItemComponent
                          item={item}
                          index={itemIndex}
                          lastIndex={chest.items.length - 1}
                          removeItem={() => removeItemFromChest(chest.id, item)}
                          isGridView={gridView}
                          isSelected={selectedItems?.has(item.uid)}
                          onSelect={onItemSelect}
                        />
                      )}
                      {isPlaceholder && (
                        <div className="w-12 h-12 rounded bg-blue-500/20 border-2 border-dashed border-blue-500/50" />
                      )}
                    </SortableItem>
                  );
                })}
              </div>
            ) : (
              <ul className="chest-items dark-theme">
                {displayItems.map((item, i) => {
                  const isPlaceholder = 'isPlaceholder' in item && item.isPlaceholder;
                  return (
                    <SortableItem
                      key={item.uid || `${item.item}-${i}`}
                      id={item.uid || item.item}
                      style={{ opacity: isPlaceholder ? 0.3 : 1, pointerEvents: isPlaceholder ? 'none' : 'auto' }}
                    >
                      {!isPlaceholder && (
                        <ItemComponent
                          item={item}
                          index={i}
                          lastIndex={chest.items.length - 1}
                          removeItem={() => removeItemFromChest(chest.id, item)}
                          isGridView={gridView}
                          isSelected={selectedItems?.has(item.uid)}
                          onSelect={onItemSelect}
                        />
                      )}
                      {isPlaceholder && (
                        <div className="h-8 rounded bg-blue-500/20 border-2 border-dashed border-blue-500/50" />
                      )}
                    </SortableItem>
                  );
                })}
              </ul>
            )}
          </SortableContext>

        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500 text-base font-medium">
            Træk ting her
          </div>
        )}
      </ItemsDropZone>
    </div>
  );
});

export default ChestComponent;
