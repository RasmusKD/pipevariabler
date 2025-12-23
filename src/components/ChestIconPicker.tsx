import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import Portal from '../Portal';
import SpriteIcon from '../SpriteIcon';
import data from '../data.json';

interface ChestIconPickerProps {
    chestId: number;
    currentIcon: string;
    updateChestIcon: (id: number, icon: string) => void;
}

const ChestIconPicker: React.FC<ChestIconPickerProps> = ({
    chestId,
    currentIcon,
    updateChestIcon,
}) => {
    const iconButtonRef = useRef<HTMLDivElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; positionAbove: boolean }>({
        top: 0,
        left: 0,
        positionAbove: false,
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Close dropdown when clicking outside
    useEffect(() => {
        if (dropdownOpen) {
            const close = () => setDropdownOpen(false);
            window.addEventListener('click', close);
            return () => window.removeEventListener('click', close);
        }
    }, [dropdownOpen]);


    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation(); // key to preventing window click from closing it immediately
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

    const IconChoice = ({ icon, name }: { icon: string, name: string }) => (
        <div
            className="cursor-pointer hover:bg-neutral-800 rounded flex justify-center items-center"
            style={{ width: 40, height: 40, flexShrink: 0 }}
            onClick={(e) => {
                e.stopPropagation();
                updateChestIcon(chestId, icon.replace('.png', ''));
                setDropdownOpen(false);
            }}
            title={name}
        >
            <SpriteIcon icon={icon} size={32} />
        </div>
    );

    const filteredIcons = data.items.filter(item =>
        item.item.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={iconButtonRef}>
            <div onClick={toggleDropdown} style={{ cursor: 'pointer' }} onPointerDown={e => e.stopPropagation()}>
                <SpriteIcon icon={`${currentIcon}.png`} size={32} />
            </div>

            {dropdownOpen && (
                <Portal>
                    <div
                        className="fixed z-50 bg-neutral-900 border border-neutral-700 shadow-xl rounded-lg p-3 w-[340px]"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            maxHeight: '300px',
                            display: 'flex',
                            flexDirection: 'column',
                            marginTop: dropdownPosition.positionAbove ? 0 : 8,
                            marginBottom: dropdownPosition.positionAbove ? 8 : 0,
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent close
                    >
                        <div className="relative mb-3">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                                <FaSearch size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Søg..."
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Ryd søgning"
                                >
                                    <FaTimes size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-2 pr-1 custom-scrollbar">
                            {filteredIcons
                                .map((item) => (
                                    <IconChoice key={item.item} icon={item.image} name={item.item} />
                                ))}
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default ChestIconPicker;
