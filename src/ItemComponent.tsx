import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ItemType } from './ItemType';
import { FaTimes } from 'react-icons/fa';
import { pixelatedIcons, useCompassImage, useClockImage, useDragPreviewImage } from './utils';

interface Item {
  item: string;
  variable: string;
  image: string;
}

interface ItemComponentProps {
  item: Item;
  isDarkMode: boolean;
  index: number;
  lastIndex: number;
  chestIds?: number[];
  removeItem?: () => void;
}

const ItemComponent: React.FC<ItemComponentProps> = ({ item, isDarkMode, index, chestIds, removeItem }) => {
  const [compassImage, setCompassImage] = useState<string>(item.image);
  const [clockImage, setClockImage] = useState<string>(item.image);
  const [dragPreviewImage, setDragPreviewImage] = useState<string | null>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLImageElement>(new Image());

  useCompassImage(item.item, setCompassImage, compassRef);
  useClockImage(item.item, setClockImage);
  useDragPreviewImage(item.item, compassImage, clockImage, setDragPreviewImage);

  useEffect(() => {
    const img = dragPreviewRef.current;
    img.src = `assets/images/icons/${item.item === 'compass' || item.item === 'recovery_compass' ? compassImage : item.item === 'clock' ? clockImage : item.image}`;
  }, [compassImage, clockImage, item]);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.ITEM,
    item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (dragPreviewImage) {
      const img = new Image();
      img.src = dragPreviewImage;
      preview(img);
    }
  }, [dragPreviewImage, preview]);

  return (
    <li
      ref={drag}
      className={`cursor-pointer p-2 flex items-center gap-4 border-b ${isDarkMode ? 'hover:bg-gray-600 border-gray-600' : 'hover:bg-gray-200 border-gray-300'} ${index === 0 ? 'border-t' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div ref={compassRef} className="item-icons">
        <img
          src={`assets/images/icons/${item.item === 'compass' || item.item === 'recovery_compass' ? compassImage : item.item === 'clock' ? clockImage : item.image}`}
          alt={item.item}
          className={`w-full h-full ${pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}`}
          loading="lazy"
        />
      </div>
      <div className="flex-1 line-clamp-1">{item.item.replace(/_/g, ' ')}</div>
      {chestIds && chestIds.length > 0 && (
        <span className="absolute flex items-center text-gray-400" style={{ top: '-2px', right: '3px', fontSize: 'small' }}>
          <img src="assets/images/icons/barrel.png" alt="chest icon" className="inline-block w-4 h-4 mr-1" />
          {chestIds.map((id) => `#${id}`).join(', ')}
        </span>
      )}
      {removeItem && (
        <button className="text-gray-500 hover:text-gray-800" onClick={removeItem}>
          <FaTimes />
        </button>
      )}
    </li>
  );
};

export default ItemComponent;
