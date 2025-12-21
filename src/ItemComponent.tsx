import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { pixelatedIcons } from './utils';
import SpriteIcon from './SpriteIcon';

interface Item {
    item: string;
    variable: string;
    image: string;
    uid: string;
}

interface ItemComponentProps {
    item: Item;
    index: number;
    lastIndex: number;
    chestIds?: number[];
    removeItem?: () => void;
    isGridView?: boolean;
}

const ItemComponent: React.FC<ItemComponentProps> = ({ item, index, chestIds, removeItem, isGridView = false }) => {

    const renderIcon = (size: number) => (
        <SpriteIcon
            icon={item.image}
            size={size}
            className={pixelatedIcons.includes(item.item) ? 'pixelated-icon' : ''}
        />
    );

    // GRID VIEW
    if (isGridView) {
        const tooltipText = `${item.item.replace(/_/g, ' ')}${chestIds && chestIds.length > 0 ? ` (Chest IDs: ${chestIds.map(id => `#${id}`).join(', ')})` : ''}`;
        const displayCount = chestIds && chestIds.length > 9 ? '9+' : (chestIds ? String(chestIds.length) : '0');

        return (
            <div
                className="group relative cursor-pointer p-1 rounded border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 transition-colors h-full"
                title={tooltipText}
            >
                {removeItem && (
                    <button
                        className="absolute -top-1 -right-1 z-10 w-5 h-5 inline-flex items-center justify-center rounded-md
                       bg-neutral-900/90 text-neutral-300 border border-neutral-700 shadow-sm
                       opacity-80 group-hover:opacity-100
                       hover:bg-neutral-800 hover:text-white
                       focus:outline-none focus:ring focus:ring-neutral-600/40"
                        onClick={(e) => { e.stopPropagation(); removeItem(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Fjern fra kiste"
                        title="Fjern"
                    >
                        <FaTimes size={10} />
                    </button>
                )}
                <div className="w-8 h-8 mx-auto flex items-center justify-center">
                    {renderIcon(32)}
                </div>
                {chestIds && chestIds.length > 0 && !removeItem && (
                    <div className="absolute -top-1 -right-1 pointer-events-none select-none">
                        <span
                            className="inline-flex items-center justify-center rounded bg-neutral-700 text-white border border-neutral-600 shadow-sm text-[10px] font-medium leading-none px-1.5 py-0.5 min-w-[16px]"
                            aria-label={`${chestIds.length} i kister`}
                        >
                            {displayCount}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // LIST VIEW
    return (
        <li
            className={`relative w-full cursor-pointer p-2 flex items-center gap-4 border-b hover:bg-neutral-700 border-neutral-700 ${index === 0 ? 'border-t' : ''}`}
        >
            <div className="item-icons flex items-center justify-center">
                {renderIcon(32)}
            </div>
            <div className="flex-1 line-clamp-1">{item.item.replace(/_/g, ' ')}</div>
            {chestIds && chestIds.length > 0 && (
                <span className="absolute flex items-center text-neutral-400 top-1 right-2 text-xs">
                    <SpriteIcon icon="barrel.png" size={16} className="mr-1" />
                    {chestIds.map((id) => `#${id}`).join(', ')}
                </span>
            )}
            {removeItem && (
                <button
                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                    onClick={(e) => { e.stopPropagation(); removeItem(); }}
                    onPointerDown={(e) => e.stopPropagation()}
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
