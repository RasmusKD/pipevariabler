import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import ItemComponent from './ItemComponent';
import { FaEdit, FaSave, FaTimes, FaRegCopy, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Portal from './Portal';
import { pixelatedIcons } from './utils';
import SpriteIcon from './SpriteIcon';
import { SortableItem } from './dnd/SortableItem';

interface Item { uid: string; item: string; variable: string; image: string; }
interface Chest { id: number; label: string; items: Item[]; icon: string; checked: boolean; }

interface ChestComponentProps {
  chest: Chest;
  index: number;
  removeChest: (id: number) => void;
  updateChestLabel: (id: number, label: string) => void;
  updateChestIcon: (id: number, icon: string) => void;
  removeItemFromChest: (chestId: number, item: Item) => void;
  gridView: boolean;
}

// Drop zone component for items inside a chest (no visual highlight - outer chest handles that)
const ItemsDropZone: React.FC<{
  chestId: number;
  children: React.ReactNode;
}> = ({ chestId, children }) => {
  const { active } = useDndContext();
  const { setNodeRef } = useDroppable({
    id: `chest-drop-${chestId}`,
    data: { chestId },
  });

  // Check if dragging from sidebar (string IDs)
  const isDraggingFromSidebar = active && typeof active.id === 'string';

  // Prevent scroll during drag
  const handleScroll = (e: React.UIEvent) => {
    if (isDraggingFromSidebar) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="mt-3 p-2 rounded-lg flex-1 flex flex-col bg-neutral-900/50 border-2 border-dashed border-neutral-700"
      style={{
        overflowY: isDraggingFromSidebar ? 'hidden' : 'auto',
        pointerEvents: 'auto'
      }}
      onScroll={handleScroll}
    >
      {/* Disable pointer events on items during sidebar drag so drop zone gets events */}
      <div className="flex-1 flex flex-col" style={{ pointerEvents: isDraggingFromSidebar ? 'none' : 'auto' }}>
        {children}
      </div>
    </div>
  );
};

const CMD_PREFIX = '/signedit 3 ' as const;
const CMD_LIMIT = 256;

const ChestComponent: React.FC<ChestComponentProps> = ({
  chest,
  index,
  removeChest,
  updateChestLabel,
  updateChestIcon,
  removeItemFromChest,
  gridView,
}) => {
  const iconButtonRef = useRef<HTMLDivElement>(null);
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
    opacity: isDragging ? 0 : 1,
  };


  // Highlight if dragging an item over this chest or the drop zone or any item inside
  const isDraggingItem = active && typeof active.id === 'string';
  const isOverChestDirectly = over?.id === chest.id;
  const isOverDropZone = over?.id === `chest-drop-${chest.id}`;

  // Check if hovering over an item that belongs to this chest
  const overIdStr = over?.id ? String(over.id) : '';
  const isOverItemInThisChest = chest.items.some(item =>
    (item.uid && item.uid === overIdStr) || item.item === overIdStr
  );

  const isOver = !!(isDraggingItem && (isOverChestDirectly || isOverDropZone || isOverItemInThisChest));


  const [isChecked, setIsChecked] = useState<boolean>(chest.checked);
  const [isEditing, setIsEditing] = useState(false);
  const [chestLabel, setChestLabel] = useState(chest.label || 'Barrel');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; positionAbove: boolean }>({
    top: 0,
    left: 0,
    positionAbove: false,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Sync checked state with props
  useEffect(() => {
    setIsChecked(chest.checked);
  }, [chest.checked]);

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

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dropdownOpen) {
      setDropdownOpen(false);
      return;
    }
    if (iconButtonRef.current) {
      const rect = iconButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const positionAbove = spaceBelow < 320 && spaceAbove > 320;
      setDropdownPosition({
        top: positionAbove ? rect.top - 310 + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        positionAbove,
      });
      setDropdownOpen(true);
    }
  };

  const IconChoice = ({ icon }: { icon: string }) => (
    <div
      className="cursor-pointer hover:bg-neutral-800 rounded flex justify-center items-center"
      style={{ width: 40, height: 40, flexShrink: 0 }}
      onClick={(e) => {
        e.stopPropagation();
        // Remove .png from icon name when saving (chest.icon should not have extension)
        updateChestIcon(chest.id, icon.replace('.png', ''));
        setDropdownOpen(false);
      }}
    >
      <SpriteIcon icon={icon} size={32} className={pixelatedIcons.includes(icon.replace('.png', '')) ? 'pixelated-icon' : ''} />
    </div>
  );

  const buildCommand = (items: Item[]) => {
    if (items.length === 0) return '';
    return `${CMD_PREFIX}${items.map((i) => i.variable).join(',')}`;
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
      className={`relative flex flex-col h-full border rounded-2xl bg-neutral-900/80 border-neutral-800 p-3 shadow-sm hover:shadow-md transition ${isOver ? 'ring-2 ring-inset ring-blue-500 border-transparent' : ''}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 cursor-grab active:cursor-grabbing border-b border-neutral-800/50"
        {...attributes}
        {...listeners}
      >
        {/* Icon button */}
        <div className="relative" ref={iconButtonRef}>
          <div onClick={toggleDropdown} style={{ cursor: 'pointer' }} onPointerDown={e => e.stopPropagation()}>
            <SpriteIcon icon={`${chest.icon}.png`} size={32} className={pixelatedIcons.includes(chest.icon) ? 'pixelated-icon' : ''} />
          </div>
          {dropdownOpen && (
            <Portal style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 1000 }}>
              <div className="w-64 p-1.5 bg-neutral-950 border border-neutral-800 text-white rounded-xl shadow-xl">
                <input
                  type="text"
                  spellCheck={false}
                  placeholder="Søg ikon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 mb-1.5 rounded-lg bg-neutral-900 outline-none focus:ring-2 focus:ring-blue-500"
                  onPointerDown={e => e.stopPropagation()}
                />
                <div className="grid grid-cols-6 gap-0.5 overflow-y-auto max-h-60 pr-1">
                  {Object.keys(require('./spriteMap.json'))
                    .filter((k) => k !== '_meta')
                    .filter((k) => !searchTerm || k.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((icon) => (
                      <IconChoice key={icon} icon={icon} />
                    ))}
                </div>
              </div>
            </Portal>
          )}
        </div>
        {/* Title Area */}
        <div className="group flex-1 min-w-0 text-left flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <input
                className="border px-2 py-1 flex-1 rounded-lg bg-neutral-800 border-neutral-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck={false}
                value={chestLabel}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                onChange={(e) => setChestLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                autoFocus
              />
              <button className="text-blue-400 hover:text-blue-300 transition-colors" onClick={(e) => { e.stopPropagation(); handleSave(); }} onPointerDown={e => e.stopPropagation()} aria-label="Gem navn">
                <FaSave />
              </button>
            </div>
          ) : (
            <>
              <span
                className="truncate text-base font-semibold cursor-pointer"
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                onPointerDown={(e) => e.stopPropagation()}
              >{chest.label || 'Barrel'}</span>
              <button className="text-blue-400 hover:text-blue-300 transition-colors" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} onPointerDown={e => e.stopPropagation()} aria-label="Rediger navn">
                <FaEdit />
              </button>
            </>
          )}
        </div>

        {/* Right actions */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            {/* Done toggle */}
            <button onClick={(e) => { e.stopPropagation(); handleDoneToggle(); }} onPointerDown={e => e.stopPropagation()} className={`p-1.5 -m-1.5 transition-colors ${isChecked ? 'text-green-400 hover:text-green-300' : 'text-neutral-400 hover:text-neutral-200'}`} title={isChecked ? 'Markér som færdig' : 'Markér som ufærdig'}>
              {isChecked ? <FaCheckSquare /> : <FaRegSquare />}
            </button>

            {/* Copy command */}
            {chest.items.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(command);
                  toast.dismiss();
                  toast.success('Kommando kopieret!', { icon: false, position: 'top-center', autoClose: 2000, hideProgressBar: true, closeOnClick: true, pauseOnHover: false, draggable: false, theme: 'dark', transition: Zoom, closeButton: false })
                }}
                onPointerDown={e => e.stopPropagation()}
                className="text-green-500 hover:text-green-400 transition-colors"
                title="Kopiér kommando"
              >
                <FaRegCopy />
              </button>
            )}

            {/* Delete chest */}
            <button onClick={(e) => { e.stopPropagation(); removeChest(chest.id); }} onPointerDown={e => e.stopPropagation()} className="text-red-500 hover:text-red-400 transition-colors" title="Slet kiste">
              <FaTimes />
            </button>
          </div>
        )}

        {/* ID tag */}
        <div className="absolute top-1 right-2 text-[11px] text-neutral-400 select-none">#{chest.id}</div>
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
      <ItemsDropZone chestId={chest.id}>
        <SortableContext items={chest.items.map(i => i.uid || i.item)} strategy={rectSortingStrategy}>
          {chest.items.length > 0 ? (
            gridView ? (
              <div className="grid grid-cols-6 gap-2">
                {chest.items.map((item, itemIndex) => (
                  <SortableItem key={item.uid || `${item.item}-${itemIndex}`} id={item.uid || item.item}>
                    <ItemComponent
                      item={item}
                      index={itemIndex}
                      lastIndex={chest.items.length - 1}
                      removeItem={() => removeItemFromChest(chest.id, item)}
                      isGridView={gridView}
                    />
                  </SortableItem>
                ))}
              </div>
            ) : (
              <ul className="chest-items dark-theme">
                {chest.items.map((item, i) => (
                  <SortableItem key={item.uid || `${item.item}-${i}`} id={item.uid || item.item} className="mb-1">
                    <ItemComponent
                      item={item}
                      index={i}
                      lastIndex={chest.items.length - 1}
                      removeItem={() => removeItemFromChest(chest.id, item)}
                      isGridView={gridView}
                    />
                  </SortableItem>
                ))}
              </ul>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-500 text-base font-medium">
              Træk ting her
            </div>
          )}
        </SortableContext>
      </ItemsDropZone>
    </div>
  );
};

export default ChestComponent;
