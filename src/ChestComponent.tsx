import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemType } from './ItemType';
import ItemComponent from './ItemComponent';
import { FaEdit, FaSave, FaTimes, FaRegCopy, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import itemsData from './data.json';
import Portal from './Portal';
import { pixelatedIcons, useCompassImage, useClockImage, useDragPreviewImage } from './utils';

interface Item { item: string; variable: string; image: string; }
interface Chest { id: number; label: string; items: Item[]; icon: string; checked: boolean; }

interface ChestComponentProps {
  chest: Chest;
  index: number;
  onDrop: (item: Item, chestId: number) => void;
  removeChest: (id: number) => void;
  updateChestLabel: (id: number, label: string) => void;
  updateChestIcon: (id: number, icon: string) => void;
  removeItemFromChest: (chestId: number, item: Item) => void;
  moveChest: (dragIndex: number, hoverIndex: number) => void;
  gridView: boolean; // global layout toggle for items inside chest
}

const CMD_PREFIX = '/signedit 3 ' as const;
const CMD_LIMIT = 256;

const ChestComponent: React.FC<ChestComponentProps> = ({
  chest,
  index,
  onDrop,
  removeChest,
  updateChestLabel,
  updateChestIcon,
  removeItemFromChest,
  moveChest,
  gridView,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLDivElement>(null);
  const compassHostRef = useRef<HTMLDivElement>(null);

  const [compassImage, setCompassImage] = useState<string>(
    chest.icon === 'compass'
      ? 'compass_00.png'
      : chest.icon === 'recovery_compass'
        ? 'recovery_compass_00.png'
        : `${chest.icon}.png`
  );
  const [clockImage, setClockImage] = useState<string>(
    chest.icon === 'clock' ? 'clock_00.png' : `${chest.icon}.png`
  );
  const [dragPreviewImage, setDragPreviewImage] = useState<string | null>(null);

  const [isChecked, setIsChecked] = useState<boolean>(chest.checked);
  const [isEditing, setIsEditing] = useState(false);
  const [chestLabel, setChestLabel] = useState(chest.label || 'Barrel');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(`chest-collapsed-${chest.id}`);
    return saved ? JSON.parse(saved) : false;
  });

  // Icon picker
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; positionAbove: boolean }>({
    top: 0, left: 0, positionAbove: false
  });
  const [searchTerm, setSearchTerm] = useState('');

  useCompassImage(chest.icon, setCompassImage, compassHostRef);
  useClockImage(chest.icon, setClockImage);
  useDragPreviewImage(chest.icon, compassImage, clockImage, setDragPreviewImage);

  useEffect(() => {
    setIsChecked(chest.checked);
  }, [chest.checked]);

  useEffect(() => { localStorage.setItem(`chest-checked-${chest.id}`, JSON.stringify(isChecked)); }, [isChecked, chest.id]);
  useEffect(() => { localStorage.setItem(`chest-collapsed-${chest.id}`, JSON.stringify(isCollapsed)); }, [isCollapsed, chest.id]);

  // DnD
  const [{ isOver }, drop] = useDrop({
    accept: [ItemType.ITEM, ItemType.CHEST],
    hover(item: { type: string; index: number }, monitor) {
      if (!ref.current) return;
      if (item.type === ItemType.CHEST) {
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

        moveChest(dragIndex, hoverIndex);
        (item as any).index = hoverIndex;
      }
    },
    drop(item: Item | { type: string; index: number }) { if ('item' in item) onDrop(item, chest.id); },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.CHEST,
    item: { type: ItemType.CHEST, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => !isEditing,
  });

  useEffect(() => {
    if (dragPreviewImage) {
      const img = new Image();
      img.src = dragPreviewImage;
      preview(img);
    }
  }, [dragPreviewImage, preview]);

  drag(drop(ref));

  // Icon list
  const availableIcons = useMemo(
    () => Array.from(new Set(itemsData.items.map(i => i.image.replace('.png', '')))),
    []
  );
  const filteredIcons = useMemo(
    () => availableIcons.filter(icon => icon.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, '_'))),
    [availableIcons, searchTerm]
  );

  const handleSave = () => {
    updateChestLabel(chest.id, chestLabel.trim() || 'Barrel');
    setIsEditing(false);
  };

  const handleCopy = () => {
    const cmd = buildCommand(chest.items);
    navigator.clipboard.writeText(cmd);
    toast.dismiss();
    toast.success(
      <div className="flex gap-2 items-center">
        <FaRegCopy className="text-green-500" /> Kommando kopieret!
      </div>,
      {
        icon: false,
        position: 'top-center',
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        theme: 'dark',
        transition: Zoom,
        closeButton: false,
      }
    );
  };

  const calculateDropdownPosition = () => {
    if (!iconButtonRef.current) return;
    const rect = iconButtonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 300;
    const spaceBelow = viewportHeight - rect.bottom;
    const positionAbove = spaceBelow < dropdownHeight;
    const top = positionAbove ? rect.top + window.scrollY - dropdownHeight : rect.bottom + window.scrollY;
    const left = rect.left + window.scrollX;
    setDropdownPosition({ top, left, positionAbove });
  };

  const toggleDropdown = () => {
    calculateDropdownPosition();
    setDropdownOpen((v) => !v);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (!dropdownOpen) return;
      calculateDropdownPosition();
      const iconRect = iconButtonRef.current?.getBoundingClientRect();
      if (!iconRect) return;
      const visible =
        iconRect.top >= 0 &&
        iconRect.left >= 0 &&
        iconRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        iconRect.right <= (window.innerWidth || document.documentElement.clientWidth);
      if (!visible) setDropdownOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize);
    window.addEventListener('resize', handleScrollOrResize);
    const chestDiv = ref.current?.parentElement;
    chestDiv?.addEventListener('scroll', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      chestDiv?.removeEventListener('scroll', handleScrollOrResize);
    };
  }, [dropdownOpen]);

  const selectIcon = (icon: string) => {
    updateChestIcon(chest.id, icon);
    setDropdownOpen(false);
  };

  const IconChoice: React.FC<{ icon: string }> = ({ icon }) => {
    const [compassImageLocal, setCompassImageLocal] = useState<string>(
      icon === 'compass'
        ? 'compass_00.png'
        : icon === 'recovery_compass'
          ? 'recovery_compass_00.png'
          : `${icon}.png`
    );
    const [clockImageLocal, setClockImageLocal] = useState<string>(
      icon === 'clock' ? 'clock_00.png' : `${icon}.png`
    );
    const compassLocalRef = useRef<HTMLDivElement>(null);

    useCompassImage(icon, setCompassImageLocal, compassLocalRef);
    useClockImage(icon, setClockImageLocal);

    const src = `${process.env.PUBLIC_URL}/assets/images/icons/${icon === 'compass' || icon === 'recovery_compass'
        ? compassImageLocal
        : icon === 'clock'
          ? clockImageLocal
          : `${icon}.png`
      }`;

    const isSelected = icon === chest.icon;

    return (
      <button
        type="button"
        onClick={() => selectIcon(icon)}
        className={`p-1 rounded transition ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-neutral-600'}`}
        aria-label={`Vælg ikon ${icon}`}
      >
        <div ref={compassLocalRef} className="flex items-center justify-center">
          <img
            src={src}
            alt={icon}
            className={`w-8 h-8 ${pixelatedIcons.includes(icon) ? 'pixelated-icon' : ''}`}
            decoding="async"
          />
        </div>
      </button>
    );
  };

  const handleDoneToggle = () => {
    const next = !isChecked;
    setIsChecked(next);
    localStorage.setItem(`chest-checked-${chest.id}`, JSON.stringify(next));
  };

  // Command usage
  const command = useMemo(() => buildCommand(chest.items), [chest.items]);
  const cmdLength = command.length;
  const pct = Math.min(100, Math.round((cmdLength / CMD_LIMIT) * 100));
  const overLimit = cmdLength > CMD_LIMIT;

  return (
    <div
      ref={ref}
      className={`relative flex flex-col border rounded-2xl bg-neutral-900/80 border-neutral-800 p-3 shadow-sm hover:shadow-md transition ${isOver ? 'ring-1 ring-blue-500' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Icon button */}
        <div className="relative" ref={iconButtonRef}>
          <div ref={compassHostRef}>
            <img
              src={`${process.env.PUBLIC_URL}/assets/images/icons/${chest.icon === 'compass' || chest.icon === 'recovery_compass'
                  ? compassImage
                  : chest.icon === 'clock'
                    ? clockImage
                    : `${chest.icon}.png`
                }`}
              alt="icon"
              onClick={toggleDropdown}
              className={`w-10 h-10 cursor-pointer rounded-lg bg-neutral-800 p-1.5 ${pixelatedIcons.includes(chest.icon) ? 'pixelated-icon' : ''} hover:bg-neutral-700 transition`}
              decoding="async"
            />
          </div>
          {dropdownOpen && (
            <Portal style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 1000 }}>
              <div className="w-56 p-2 flex flex-col gap-2 bg-neutral-950 border border-neutral-800 text-white rounded-xl shadow-xl" style={{ maxHeight: 300 }}>
                <div className="sticky top-0 z-10 bg-neutral-950">
                  <input
                    type="text"
                    spellCheck="false"
                    placeholder="Søg ikon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1 overflow-auto pr-1">
                  {filteredIcons.map((icon) => (
                    <IconChoice key={icon} icon={icon} />
                  ))}
                </div>
              </div>
            </Portal>
          )}
        </div>

        {/* Title (click to collapse/expand) */}
        <button
          type="button"
          className="group flex-1 min-w-0 text-left flex items-center gap-2"
          onClick={() => setIsCollapsed(v => !v)}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Udvid kiste' : 'Skjul kiste'}
        >
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <input
                className="border px-2 py-1 flex-1 rounded-lg bg-neutral-800 border-neutral-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
                spellCheck="false"
                value={chestLabel}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setChestLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                autoFocus
              />
              <button className="text-blue-400 hover:text-blue-300" onClick={(e) => { e.stopPropagation(); handleSave(); }} aria-label="Gem navn">
                <FaSave />
              </button>
            </div>
          ) : (
            <>
              <span className="truncate text-base font-semibold">{chest.label || 'Barrel'}</span>
              {isChecked && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-600/20 text-green-400 border border-green-700/40">
                  done
                </span>
              )}
            </>
          )}
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            className="text-neutral-300 hover:text-white"
            onClick={(e) => { e.stopPropagation(); handleDoneToggle(); }}
            title={isChecked ? 'Markér som ikke færdig' : 'Markér som færdig'}
            aria-label="Toggle done"
          >
            {isChecked ? <FaCheckSquare /> : <FaRegSquare />}
          </button>

          {chest.items.length > 0 && (
            <button className="text-green-500 hover:text-green-400" onClick={(e) => { e.stopPropagation(); handleCopy(); }} title="Kopiér kommando">
              <FaRegCopy />
            </button>
          )}
          {!isEditing && (
            <button className="text-blue-400 hover:text-blue-300" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title="Redigér navn">
              <FaEdit />
            </button>
          )}
          <button className="text-red-500 hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeChest(chest.id); }} title="Slet kiste">
            <FaTimes />
          </button>
        </div>

        {/* ID tag */}
        <div className="absolute top-1 right-2 text-[11px] text-neutral-400 select-none">#{chest.id}</div>
      </div>

      {/* Command usage bar */}
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

      {/* Body */}
      {!isCollapsed && (
        <>
          {chest.items.length > 0 ? (
            gridView ? (
              <div className="mt-3 grid grid-cols-6 gap-2">
                {chest.items.map((item, itemIndex) => (
                  <ItemComponent
                    key={item.item}
                    item={item}
                    index={itemIndex}
                    lastIndex={chest.items.length - 1}
                    isGridView
                    removeItem={() => removeItemFromChest(chest.id, item)}  // <- fjern-knap i grid
                  />
                ))}
              </div>
            ) : (
              <ul className="mt-3 chest-items dark-theme">
                {chest.items.map((item, itemIndex) => (
                  <ItemComponent
                    key={item.item}
                    item={item}
                    index={itemIndex}
                    lastIndex={chest.items.length - 1}
                    removeItem={() => removeItemFromChest(chest.id, item)}
                  />
                ))}
              </ul>
            )
          ) : (
            <div className="mt-3 chest-placeholder dark rounded-lg border border-dashed border-neutral-800 bg-neutral-900/60 text-neutral-400">
              Træk ting her for at tilføje dem til kisten
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helpers
function buildCommand(items: Item[]): string {
  const vars = items.map(i => i.variable).join(',');
  return `${CMD_PREFIX}${vars}`;
}

export default ChestComponent;
