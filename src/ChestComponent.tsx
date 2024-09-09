import React, { useState, useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemType } from './ItemType';
import ItemComponent from './ItemComponent';
import { FaEdit, FaSave, FaTimes, FaRegCopy } from 'react-icons/fa';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import itemsData from './data.json';
import Portal from './Portal';
import { pixelatedIcons, useCompassImage, useClockImage, useDragPreviewImage } from './utils';

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
  checked: boolean;
}

interface ChestComponentProps {
  chest: Chest;
  index: number;
  onDrop: (item: Item, chestId: number) => void;
  isDarkMode: boolean;
  removeChest: (id: number) => void;
  updateChestLabel: (id: number, label: string) => void;
  updateChestIcon: (id: number, icon: string) => void;
  removeItemFromChest: (chestId: number, item: Item) => void;
  moveChest: (dragIndex: number, hoverIndex: number) => void;
  setChests: React.Dispatch<React.SetStateAction<Chest[]>>;
}

const ChestComponent: React.FC<ChestComponentProps> = ({
  chest,
  index,
  onDrop,
  isDarkMode,
  removeChest,
  updateChestLabel,
  updateChestIcon,
  removeItemFromChest,
  moveChest,
  setChests
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const [compassImage, setCompassImage] = useState<string>(chest.icon === 'compass' ? 'compass_00.png' : chest.icon === 'recovery_compass' ? 'recovery_compass_00.png' : `${chest.icon}.png`);
  const [clockImage, setClockImage] = useState<string>(chest.icon === 'clock' ? 'clock_00.png' : `${chest.icon}.png`);
  const [dragPreviewImage, setDragPreviewImage] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState<boolean>(chest.checked);
  const dragPreviewRef = useRef<HTMLImageElement>(new Image());

  useCompassImage(chest.icon, setCompassImage, compassRef);
  useClockImage(chest.icon, setClockImage);
  useDragPreviewImage(chest.icon, compassImage, clockImage, setDragPreviewImage);

  useEffect(() => {
    const img = dragPreviewRef.current;
    img.src = `assets/images/icons/${chest.icon === 'compass' || chest.icon === 'recovery_compass' ? compassImage : chest.icon === 'clock' ? clockImage : `${chest.icon}.png`}`;
  }, [compassImage, clockImage, chest.icon]);

  useEffect(() => {
    setIsChecked(chest.checked);
  }, [chest.checked]);

  useEffect(() => {
    localStorage.setItem(`chest-checked-${chest.id}`, JSON.stringify(isChecked));
  }, [isChecked, chest.id]);

  const [{ isOver }, drop] = useDrop({
    accept: [ItemType.ITEM, ItemType.CHEST],
    hover(item: { type: string; index: number }, monitor) {
      if (!ref.current) {
        return;
      }

      if (item.type === ItemType.CHEST) {
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) {
          return;
        }

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return;
        }

        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return;
        }

        moveChest(dragIndex, hoverIndex);
        item.index = hoverIndex;
      }
    },
    drop(item: Item | { type: string; index: number }) {
      if ('item' in item) {
        onDrop(item, chest.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.CHEST,
    item: { type: ItemType.CHEST, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
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

  const [isEditing, setIsEditing] = useState(false);
  const [chestLabel, setChestLabel] = useState(chest.label || "Barrel");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; positionAbove: boolean }>({ top: 0, left: 0, positionAbove: false });
  const [searchTerm, setSearchTerm] = useState('');

  const availableIcons = Array.from(new Set(itemsData.items.map(item => item.image.replace('.png', ''))));
  const filteredIcons = availableIcons.filter(icon => icon.toLowerCase().includes(searchTerm.toLowerCase().replace(/ /g, '_')));

  useEffect(() => {
    if (isEditing) {
      setChestLabel(chest.label || "Barrel");
    }
  }, [isEditing, chest.label]);

  const handleSave = () => {
    updateChestLabel(chest.id, chestLabel);
    setIsEditing(false);
  };

  const handleCopy = () => {
    const command = `/signedit 3 ${chest.items.map(item => item.variable).join(',')}`;
    navigator.clipboard.writeText(command);
    toast.dismiss();
    toast.success(
      <div className="flex gap-2 items-center">
        <FaRegCopy className="text-green-500 hover:text-green-700"/> Kommando kopieret!
      </div>,
      {
        icon: false,
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
      }
    );
  };

  const calculateDropdownPosition = () => {
    if (iconButtonRef.current) {
      const rect = iconButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300;
      const spaceBelow = viewportHeight - rect.bottom;
      const positionAbove = spaceBelow < dropdownHeight;
      const top = positionAbove ? rect.top + window.scrollY - dropdownHeight : rect.bottom + window.scrollY;
      const left = rect.left + window.scrollX;
      setDropdownPosition({ top, left, positionAbove });
    }
  };

  const toggleDropdown = () => {
    calculateDropdownPosition();
    setDropdownOpen(!dropdownOpen);
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (dropdownOpen) {
        calculateDropdownPosition();
        const iconButtonRect = iconButtonRef.current?.getBoundingClientRect();
        const chestRect = ref.current?.getBoundingClientRect();
        if (iconButtonRect && chestRect) {
          const isIconVisible = (
            iconButtonRect.top >= 0 &&
            iconButtonRect.left >= 0 &&
            iconButtonRect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            iconButtonRect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
          if (!isIconVisible) {
            setDropdownOpen(false);
          }
        }
      }
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

  const IconComponent: React.FC<{ icon: string }> = ({ icon }) => {
    const [compassImage, setCompassImage] = useState<string>(icon === 'compass' ? 'compass_00.png' : icon === 'recovery_compass' ? 'recovery_compass_00.png' : `${icon}.png`);
    const [clockImage, setClockImage] = useState<string>(icon === 'clock' ? 'clock_00.png' : `${icon}.png`);
    const compassRef = useRef<HTMLDivElement>(null);

    useCompassImage(icon, setCompassImage, compassRef);
    useClockImage(icon, setClockImage);

    return (
      <div ref={compassRef} className="cursor-pointer flex items-center justify-center" onClick={() => selectIcon(icon)}>
        <img
          src={`assets/images/icons/${icon === 'compass' || icon === 'recovery_compass' ? compassImage : icon === 'clock' ? clockImage : `${icon}.png`}`}
          alt={icon}
          className={`w-8 h-8 ${pixelatedIcons.includes(icon) ? 'pixelated-icon' : ''}`}
        />
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={`relative flex flex-col gap-2 border rounded ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'} p-2 flex-1`}
      style={{ opacity: isDragging || isOver ? 0.5 : 1 }}
    >
      <div className="absolute flex items-center gap-1 text-gray-400" style={{ top: '-2px', right: '3px', fontSize: 'small' }}>
        #{index + 1}
      </div>
      <div className="flex justify-between items-center gap-2">
        <div className="relative" ref={iconButtonRef}>
          <div ref={compassRef}>
            <img
              src={`assets/images/icons/${chest.icon === 'compass' || chest.icon === 'recovery_compass' ? compassImage : chest.icon === 'clock' ? clockImage : `${chest.icon}.png`}`}
              alt="icon"
              className={`item-icons cursor-pointer ${pixelatedIcons.includes(chest.icon) ? 'pixelated-icon' : ''}`}
              onClick={toggleDropdown}
            />
          </div>
          {dropdownOpen && (
            <Portal style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 1000 }}>
              <div
                className={`w-48 p-2 flex flex-col gap-2 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-200 border-gray-200 text-black'} rounded shadow-lg`}
                style={{ maxHeight: '300px'}}
              >
                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 1)' : 'rgba(255, 255, 255, 1)' }}>
                  <input
                    type="text"
                    spellCheck="false"
                    placeholder="Søg..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full p-2 rounded ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
                  />
                </div>
                <div className={`${isDarkMode ? 'dark-theme' : 'light-theme'}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0', overflow: 'auto' }}>
                  {filteredIcons.map((icon) => (
                    <IconComponent key={icon} icon={icon} />
                  ))}
                </div>
              </div>
            </Portal>
          )}
        </div>
        <div className="flex-1 flex gap-2 items-center">
          {isEditing ? (
            <input
              className={`border px-1 flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              spellCheck="false"
              value={chestLabel}
              onChange={(e) => setChestLabel(e.target.value)}
              onBlur={handleSave}
              autoFocus
            />
          ) : (
              <div className="gap-2 flex">
            <span className="flex-1" onDoubleClick={() => setIsEditing(true)}>{chest.label || "Barrel"}</span>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  setIsChecked(!isChecked);
                  setChests((prevChests: Chest[]) =>
                    prevChests.map(chestItem =>
                      chestItem.id === chest.id ? { ...chestItem, checked: !chestItem.checked } : chestItem
                    )
                  );
                }}
                className="mr-2"
              />
              </div>
          )}
          {isEditing &&
            <button className="text-blue-500 hover:text-blue-700" onClick={handleSave}>
              <FaSave />
            </button>}
        </div>
        <div className="flex items-center gap-2">
        {!isEditing &&
            <button className="text-blue-500 hover:text-blue-700" onClick={() => setIsEditing(true)}>
              <FaEdit />
            </button>}
          {chest.items.length > 0 && (
            <button className="text-green-500 hover:text-green-700" onClick={handleCopy}>
              <FaRegCopy />
            </button>
          )}
          <button className="text-red-500 hover:text-red-700" onClick={() => removeChest(chest.id)}>
            <FaTimes />
          </button>
        </div>
      </div>
      {chest.items.length > 0 ? (
        <ul className={`chest-items ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
          {chest.items.map((item, itemIndex) => (
            <ItemComponent
              key={item.item}
              item={item}
              isDarkMode={isDarkMode}
              index={itemIndex}
              lastIndex={chest.items.length - 1}
              removeItem={() => removeItemFromChest(chest.id, item)}
            />
          ))}
        </ul>
      ) : (
        <div className={`chest-placeholder ${isDarkMode ? 'dark' : 'light'}`}>
          Træk ting her for at tilføje dem til kisten
        </div>
      )}
    </div>
  );
};

export default ChestComponent;
