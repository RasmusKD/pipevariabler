import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
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

  // Make chest droppable for items (if empty or dragging over container)
  const { setNodeRef, isOver } = useDroppable({
    id: chest.id,
  });

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
    // We should probably update the parent state too, but local state is fine for visual if parent doesn't strictly control it
    // Actually, App.tsx initializes from prop, but we might want to trigger an update.
    // The props interface doesn't have toggleChecked. For now keep local + localStorage.
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
      className="cursor-pointer p-1 hover:bg-neutral-800 rounded flex justify-center items-center"
      onClick={(e) => {
        e.stopPropagation(); // Stop propagation to prevent drag
        updateChestIcon(chest.id, icon);
        setDropdownOpen(false);
      }}
    >
      <SpriteIcon icon={`${icon}.png`} size={32} className={pixelatedIcons.includes(icon) ? 'pixelated-icon' : ''} />
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
      className={`relative flex flex-col h-full border rounded-2xl bg-neutral-900/80 border-neutral-800 p-3 shadow-sm hover:shadow-md transition ${isOver ? 'ring-1 ring-blue-500' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 cursor-grab active:cursor-grabbing border-b border-neutral-800/50 pb-2 mb-2">
        {/* Icon button */}
        <div className="relative" ref={iconButtonRef}>
          <div onClick={toggleDropdown} style={{ cursor: 'pointer' }} onPointerDown={e => e.stopPropagation()}>
            <SpriteIcon icon={`${chest.icon}.png`} size={32} className={pixelatedIcons.includes(chest.icon) ? 'pixelated-icon' : ''} />
          </div>
          {dropdownOpen && (
            <Portal style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 1000 }}>
              <div className="w-56 p-2 flex flex-col gap-2 bg-neutral-950 border border-neutral-800 text-white rounded-xl shadow-xl" style={{ maxHeight: 300 }}>
                <div className="sticky top-0 z-10 bg-neutral-950">
                  <input
                    type="text"
                    spellCheck={false}
                    placeholder="Søg ikon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-900 outline-none focus:ring-2 focus:ring-blue-500"
                    onPointerDown={e => e.stopPropagation()}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1 overflow-auto pr-1">
                  {Object.keys(require('./spriteMap.json'))
                    .filter((k) => k !== '_meta')
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
              <button className="text-blue-400 hover:text-blue-300" onClick={(e) => { e.stopPropagation(); handleSave(); }} onPointerDown={e => e.stopPropagation()} aria-label="Gem navn">
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
              <button className="text-blue-400 hover:text-blue-300" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} onPointerDown={e => e.stopPropagation()} aria-label="Rediger navn">
                <FaEdit />
              </button>
            </>
          )}
        </div>

        {/* Right actions */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            {/* Done toggle */}
            <button onClick={(e) => { e.stopPropagation(); handleDoneToggle(); }} onPointerDown={e => e.stopPropagation()} className={`w-5 h-5 ${isChecked ? 'text-green-400' : 'text-neutral-400'}`} title={isChecked ? 'Markér som færdig' : 'Markér som ufærdig'}>
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
                className="text-green-500 hover:text-green-400"
                title="Kopiér kommando"
              >
                <FaRegCopy />
              </button>
            )}

            {/* Delete chest */}
            <button onClick={(e) => { e.stopPropagation(); removeChest(chest.id); }} onPointerDown={e => e.stopPropagation()} className="text-red-500 hover:text-red-400" title="Slet kiste">
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

      {/* Items List */}
      {/* We need SortableContext for items */}
      <SortableContext items={chest.items.map(i => i.uid || i.item)} strategy={rectSortingStrategy}>
        {chest.items.length > 0 ? (
          gridView ? (
            <div className="mt-3 grid grid-cols-8 gap-1 p-2 bg-neutral-900/50 rounded-lg max-h-48 overflow-y-auto">
              {chest.items.map((item, itemIndex) => (
                <SortableItem key={item.uid || `${item.item}-${itemIndex}`} id={item.uid || item.item} className="aspect-square">
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
            <ul className="mt-2 chest-items dark-theme max-h-60 overflow-y-auto">
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
          <div className="mt-3 chest-placeholder dark rounded-lg border border-dashed border-neutral-800 bg-neutral-900/60 text-neutral-400">
            Træk ting her for at tilføje dem til kisten
          </div>
        )}
      </SortableContext>
    </div>
  );
};

export default ChestComponent;
