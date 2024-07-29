import React, { useState, useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { ItemType } from './ItemType';
import { FaTimes } from 'react-icons/fa';

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
  const compassRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLImageElement>(new Image());

  useEffect(() => {
    if (item.item === 'compass' || item.item === 'recovery_compass') {
      const handleMouseMove = (event: MouseEvent) => {
        if (compassRef.current) {
          const rect = compassRef.current.getBoundingClientRect();
          const compassCenterX = rect.left + rect.width / 2;
          const compassCenterY = rect.top + rect.height / 2;
          const angle = Math.atan2(event.clientY - compassCenterY, event.clientX - compassCenterX);
          const angleDeg = angle * (180 / Math.PI) - 90;
          const compassIndex = Math.round((angleDeg + 360) / 11.25) % 32;
          const newCompassImage = `${item.item}_${String(item.item === 'compass' ? compassIndex : (compassIndex + 16) % 32).padStart(2, '0')}.png`;
          setCompassImage(newCompassImage);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }

    if (item.item === 'clock') {
      const updateClockImage = () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        const clockIndex = Math.floor(((totalMinutes + 720) % 1440) / 1440 * 64);
        const newClockImage = `clock_${String(clockIndex).padStart(2, '0')}.png`;
        setClockImage(newClockImage);
      };

      updateClockImage();
      const interval = setInterval(updateClockImage, 60000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [item]);

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
    preview(dragPreviewRef.current);
  }, [preview]);

  const pixelatedIcons = ['compass', 'clock', 'recovery_compass','breeze_rod', 'broken_elytra', 'crafter', 'mace','bolt_armor_trim_smithing_template','chiseled_copper','chiseled_tuff','chiseled_tuff_bricks','copper_bulb','copper_door','copper_grate','copper_trapdoor','exposed_chiseled_copper','exposed_copper_bulb','exposed_copper_door','exposed_copper_grate','exposed_copper_trapdoor','flow_armor_trim_smithing_template','flow_banner_pattern','flow_pottery_sherd','guster_banner_pattern','guster_pottery_sherd','music_disc_creator','music_disc_creator_music_box','music_disc_precipice','ominous_bottle','ominous_trial_key','oxidized_chiseled_copper','oxidized_copper_bulb','oxidized_copper_door','oxidized_copper_grate','oxidized_copper_trapdoor','wind_charge','trial_key','tuff_bricks','waxed_chiseled_copper','waxed_copper_bulb','waxed_copper_grate','waxed_exposed_chiseled_copper','waxed_exposed_copper_bulb','waxed_exposed_copper_door','waxed_exposed_copper_grate','waxed_exposed_copper_trapdoor','waxed_oxidized_chiseled_copper','waxed_oxidized_copper_bulb','waxed_oxidized_copper_door','waxed_oxidized_copper_grate','waxed_oxidized_copper_trapdoor','waxed_weathered_chiseled_copper','waxed_weathered_copper_bulb','waxed_weathered_copper_door','waxed_weathered_copper_grate','waxed_weathered_copper_trapdoor','weathered_chiseled_copper','weathered_copper_bulb','weathered_copper_door','weathered_copper_grate','weathered_copper_trapdoor'];

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
      <div className="flex-1">{item.item.replace(/_/g, ' ')}</div>
      {chestIds && chestIds.length > 0 && (
        <span className="absolute flex items-center text-gray-400" style={{ top: '-2px', right: '3px', fontSize: 'small' }}>
          <img src="assets/images/icons/chest.png" alt="chest icon" className="inline-block w-4 h-4 mr-1" />
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