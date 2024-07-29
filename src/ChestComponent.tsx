import React, { useState, useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ItemType } from './ItemType';
import ItemComponent from './ItemComponent';
import { FaTimes, FaEdit, FaRegCopy } from 'react-icons/fa';
import { toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Item {
  item: string;
  variable: string;
  image: string;
}

interface Chest {
  id: number;
  label: string;
  items: Item[];
}

interface ChestComponentProps {
  chest: Chest;
  index: number;
  onDrop: (item: Item, chestId: number) => void;
  isDarkMode: boolean;
  removeChest: (id: number) => void;
  updateChestLabel: (id: number, label: string) => void;
  removeItemFromChest: (chestId: number, item: Item) => void;
  moveChest: (dragIndex: number, hoverIndex: number) => void;
}

const ChestComponent: React.FC<ChestComponentProps> = ({
  chest,
  index,
  onDrop,
  isDarkMode,
  removeChest,
  updateChestLabel,
  removeItemFromChest,
  moveChest
}) => {
  const ref = useRef<HTMLDivElement>(null);

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

  const [{ isDragging }, drag] = useDrag({
    type: ItemType.CHEST,
    item: { type: ItemType.CHEST, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const [isEditing, setIsEditing] = useState(false);
  const [chestLabel, setChestLabel] = useState(chest.label);

  useEffect(() => {
    if (isEditing) {
      setChestLabel(chest.label);
    }
  }, [isEditing, chest.label]);

  const handleSave = () => {
    updateChestLabel(chest.id, chestLabel);
    setIsEditing(false);
  };

  const handleCopy = () => {
    const command = `/se 3 ${chest.items.map(item => item.variable).join(';')}`;
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
        <img src="assets/images/icons/chest.png" alt="chest icon" className="item-icons" />
        {isEditing ? (
          <input
            className={`border p-1 flex-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            value={chestLabel}
            onChange={(e) => setChestLabel(e.target.value)}
          />
        ) : (
          <>
            <span className="flex-1">{chest.label}</span>
            <button className="text-blue-500 hover:text-blue-700" onClick={() => setIsEditing(true)}>
              <FaEdit />
            </button>
          </>
        )}
        {isEditing ? (
          <button className="text-blue-500 hover:text-blue-700" onClick={handleSave}>
            Gem
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {chest.items.length > 0 && (
              <button className="text-green-500 hover:text-green-700" onClick={handleCopy}>
                <FaRegCopy />
              </button>
            )}
            <button className="text-red-500 hover:text-red-700" onClick={() => removeChest(chest.id)}>
              <FaTimes />
            </button>
          </div>
        )}
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
