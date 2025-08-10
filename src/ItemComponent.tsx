import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { ItemType } from './ItemType';
import { FaTimes } from 'react-icons/fa';
import { pixelatedIcons, useCompassImage, useClockImage, useDragPreviewImage } from './utils';

interface Item { item: string; variable: string; image: string; }

interface ItemComponentProps {
  item: Item;
  index: number;
  lastIndex: number;
  chestIds?: number[];
  removeItem?: () => void;    // hvis givet i grid => vis “X” i hjørnet
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
    img.src = `${process.env.PUBLIC_URL}/assets/images/icons/${
        item.item === 'compass' || item.item === 'recovery_compass'
            ? compassImage
            : item.item === 'clock'
                ? clockImage
                : item.image
    }`;
  }, [compassImage, clockImage, item]);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.ITEM,
    item,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    if (dragPreviewImage) { const img = new Image(); img.src = dragPreviewImage; preview(img); }
  }, [dragPreviewImage, preview]);

  // Grid view
  if (isGridView) {
    const tooltipText = `${item.item.replace(/_/g, ' ')}${
        chestIds && chestIds.length > 0 ? ` (Chest IDs: ${chestIds.map(id => `#${id}`).join(', ')})` : ''
    }`;

    return (
        <div
            ref={drag}
            className="group relative cursor-pointer p-1 rounded border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 transition-colors"
            style={{ opacity: isDragging ? 0.5 : 1 }}
            title={tooltipText}
        >
          {/* Neutral fjern-knap (kun i kiste-grid når removeItem findes) */}
          {removeItem && (
              <button
                  className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 inline-flex items-center justify-center rounded-md
                       bg-neutral-900/90 text-neutral-300 border border-neutral-700 shadow-sm
                       opacity-70 group-hover:opacity-100
                       hover:bg-neutral-800 hover:text-white
                       focus:outline-none focus:ring focus:ring-neutral-600/40"
                  onClick={(e) => { e.stopPropagation(); removeItem(); }}
                  aria-label="Fjern fra kiste"
                  title="Fjern"
              >
                <FaTimes size={10}/>
              </button>
          )}

          <div ref={compassRef} className="w-8 h-8 mx-auto">
            <img
                src={`${process.env.PUBLIC_URL}/assets/images/icons/${
                    item.item === 'compass' || item.item === 'recovery_compass'
                        ? compassImage
                        : item.item === 'clock'
                            ? clockImage
                            : item.image
                }`}
                alt={item.item}
                className={`w-full h-full ${pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}`}
                loading="lazy"
            />
          </div>

          {/* Badge for antal kister — bruges kun i sidebar-grid (ikke i kiste-grid) */}
          {chestIds && chestIds.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {chestIds.length}
              </div>
          )}
        </div>
    );
  }

  // List view
  return (
      <li
          ref={drag}
          className={`relative w-full cursor-pointer p-2 flex items-center gap-4 border-b hover:bg-neutral-700 border-neutral-700 ${index === 0 ? 'border-t' : ''}`}
          style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <div ref={compassRef} className="item-icons">
          <img
              src={`${process.env.PUBLIC_URL}/assets/images/icons/${
                  item.item === 'compass' || item.item === 'recovery_compass'
                      ? compassImage
                      : item.item === 'clock'
                          ? clockImage
                          : item.image
              }`}
              alt={item.item}
              className={`w-full h-full ${pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}`}
              loading="lazy"
          />
        </div>
        <div className="flex-1 line-clamp-1">{item.item.replace(/_/g, ' ')}</div>

        {chestIds && chestIds.length > 0 && (
            <span className="absolute flex items-center text-neutral-400 top-1 right-2 text-xs">
          <img src={`${process.env.PUBLIC_URL}/assets/images/icons/barrel.png`} alt="chest icon" className="inline-block w-4 h-4 mr-1" />
              {chestIds.map((id) => `#${id}`).join(', ')}
        </span>
        )}

        {removeItem && (
            <button
                className="text-neutral-400 hover:text-neutral-200 focus:outline-none focus:ring focus:ring-neutral-600/40 rounded"
                onClick={removeItem}
                aria-label="Fjern"
                title="Fjern"
            >
              <FaTimes />
            </button>
        )}
      </li>
  );
};

export default ItemComponent;
