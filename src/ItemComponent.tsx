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
  index: number;
  lastIndex: number;
  chestIds?: number[];
  removeItem?: () => void;
  isGridView?: boolean;
}

const ItemComponent: React.FC<ItemComponentProps> = ({
                                                       item,
                                                       index,
                                                       chestIds,
                                                       removeItem,
                                                       isGridView = false
                                                     }) => {
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
    img.src = `${process.env.PUBLIC_URL}/assets/images/icons/${item.item === 'compass' || item.item === 'recovery_compass' ? compassImage : item.item === 'clock' ? clockImage : item.image}`;
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

  // Grid view
  if (isGridView) {
    const tooltipText = `${item.item.replace(/_/g, ' ')}${
        chestIds && chestIds.length > 0 ? ` (Chest IDs: ${chestIds.map(id => `#${id}`).join(', ')})` : ''
    }`;

    return (
        <div
            ref={drag}
            className="relative cursor-pointer p-1 rounded border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 transition-colors"
            style={{ opacity: isDragging ? 0.5 : 1 }}
            title={tooltipText}
        >
          <div ref={compassRef} className="w-8 h-8 mx-auto">
            <img
                src={`${process.env.PUBLIC_URL}/assets/images/icons/${item.item === 'compass' || item.item === 'recovery_compass' ? compassImage : item.item === 'clock' ? clockImage : item.image}`}
                alt={item.item}
                className={`w-full h-full ${pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}`}
                loading="lazy"
            />
          </div>
          {chestIds && chestIds.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {chestIds.length}
              </div>
          )}
          {removeItem && (
              <button
                  className="absolute -top-1 -left-1 text-red-500 hover:text-red-600 bg-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  onClick={removeItem}
                  aria-label="Fjern"
              >
                <FaTimes size={8} />
              </button>
          )}
        </div>
    );
  }

  // List view
  return (
      <li
          ref={drag}
          className={`cursor-pointer p-2 flex items-center gap-4 border-b hover:bg-neutral-700 border-neutral-700 ${index === 0 ? 'border-t' : ''}`}
          style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <div ref={compassRef} className="item-icons">
          <img
              src={`${process.env.PUBLIC_URL}/assets/images/icons/${item.item === 'compass' || item.item === 'recovery_compass' ? compassImage : item.item === 'clock' ? clockImage : item.image}`}
              alt={item.item}
              className={`w-full h-full ${pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}`}
              loading="lazy"
          />
        </div>
        <div className="flex-1 line-clamp-1">{item.item.replace(/_/g, ' ')}</div>
        {chestIds && chestIds.length > 0 && (
            <span className="absolute flex items-center text-neutral-400" style={{ top: '-2px', right: '3px', fontSize: 'small' }}>
          <img src={`${process.env.PUBLIC_URL}/assets/images/icons/barrel.png`} alt="chest icon" className="inline-block w-4 h-4 mr-1" />
              {chestIds.map((id) => `#${id}`).join(', ')}
        </span>
        )}
        {removeItem && (
            <button className="text-neutral-400 hover:text-neutral-200" onClick={removeItem} aria-label="Fjern">
              <FaTimes />
            </button>
        )}
      </li>
  );
};

export default ItemComponent;
