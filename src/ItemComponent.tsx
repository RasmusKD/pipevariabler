import React from 'react';
import { FaTimes } from 'react-icons/fa';
import SpriteIcon from './SpriteIcon';
import { Item } from './types';

interface ChestLocation {
    chestId: number;
    displayIndex: number;
}

interface ItemComponentProps {
    item: Item;
    index: number;
    lastIndex: number;
    chestIds?: ChestLocation[];
    removeItem?: () => void;
    isGridView?: boolean;
    isSelected?: boolean;
    onSelect?: (uid: string, ctrlKey: boolean, isClick?: boolean) => void;
    onChestClick?: (chestId: number, itemName: string) => void;
}

const ItemComponent: React.FC<ItemComponentProps> = React.memo(({
    item,
    index,
    lastIndex,
    chestIds,
    removeItem,
    isGridView = false,
    isSelected = false,
    onSelect,
    onChestClick
}) => {

    const handlePointerDown = (e: React.PointerEvent) => {
        if (onSelect) {
            onSelect(item.uid, e.ctrlKey || e.metaKey);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (onSelect) {
            // Pass true for isClick to handle "clear others" if needed
            onSelect(item.uid, e.ctrlKey || e.metaKey, true);
        }
    };

    const renderIcon = (size: number) => (
        <SpriteIcon
            icon={item.image}
            size={size}
        />
    );

    // Selection highlight classes
    const selectedClass = isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/20' : '';

    // GRID VIEW
    if (isGridView) {
        const tooltipText = `${item.item.replace(/_/g, ' ')}${chestIds && chestIds.length > 0 ? ` (Chests: ${chestIds.map(c => `#${c.displayIndex}`).join(', ')})` : ''}`;
        const displayCount = chestIds && chestIds.length > 9 ? '9+' : (chestIds ? String(chestIds.length) : '0');

        return (
            <div
                className={`group relative cursor-pointer p-1 rounded border bg-neutral-800 border-neutral-700 hover:bg-neutral-700 transition-colors h-full ${selectedClass}`}
                title={tooltipText}
                onPointerDown={handlePointerDown}
                onClick={handleClick}
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
            className={`relative w-full cursor-pointer p-2 flex items-center gap-4 hover:bg-neutral-700 border-neutral-700 border-b ${index === 0 ? 'border-t' : ''} ${selectedClass}`}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
        >
            <div className="item-icons flex items-center justify-center">
                {renderIcon(32)}
            </div>
            <div className="flex-1 line-clamp-1">{item.item.replace(/_/g, ' ')}</div>
            {chestIds && chestIds.length > 0 && (
                <span className="absolute flex items-center text-neutral-400 top-1 right-2 text-xs gap-1">
                    <SpriteIcon icon="barrel.png" size={16} />
                    {chestIds.map((chest, idx) => (
                        <React.Fragment key={chest.chestId}>
                            {idx > 0 && <span>,</span>}
                            <button
                                className="hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onChestClick?.(chest.chestId, item.item); }}
                                onPointerDown={(e) => e.stopPropagation()}
                                title={`Gå til kiste #${chest.displayIndex}`}
                            >
                                #{chest.displayIndex}
                            </button>
                        </React.Fragment>
                    ))}
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
});

export default ItemComponent;
