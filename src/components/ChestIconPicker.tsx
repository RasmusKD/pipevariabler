import React, { useState, useRef, useEffect } from 'react';
import Portal from '../Portal';
import SpriteIcon from '../SpriteIcon';
import { pixelatedIcons } from '../utils';

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
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownOpen && iconButtonRef.current && !iconButtonRef.current.contains(event.target as Node)) {
                // Also check if click is inside the portal content (which is not in ref)
                // Ideally we'd have a ref on the portal content too.
                // For simplicity, we rely on the implementation below or add a ref to the portal wrapper.
            }
        };

        // Actually, simpler: we put a backdrop or handle clicks on window.
        // The previous implementation used onClick events on the toggle. 
        // And likely a backdrop in Portal or just relying on Portal's isolation? 
        // Let's stick to the previous implementation logic:
        // It had "Toggle" and "Portal".

        // Existing logic relied on `toggleDropdown` handling click.
        // And maybe clicking elsewhere didn't close it? Or maybe it did? 
        // The previous code had "setDropdownOpen(false)" in toggleDropdown.

        // Let's implement click outside listener to be safe.
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

    const IconChoice = ({ icon }: { icon: string }) => (
        <div
            className="cursor-pointer hover:bg-neutral-800 rounded flex justify-center items-center"
            style={{ width: 40, height: 40, flexShrink: 0 }}
            onClick={(e) => {
                e.stopPropagation();
                updateChestIcon(chestId, icon.replace('.png', ''));
                setDropdownOpen(false);
            }}
        >
            <SpriteIcon icon={icon} size={32} className={pixelatedIcons.includes(icon.replace('.png', '')) ? 'pixelated-icon' : ''} />
        </div>
    );

    const filteredIcons = pixelatedIcons.filter(icon =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={iconButtonRef}>
            <div onClick={toggleDropdown} style={{ cursor: 'pointer' }} onPointerDown={e => e.stopPropagation()}>
                <SpriteIcon icon={`${currentIcon}.png`} size={32} className={pixelatedIcons.includes(currentIcon) ? 'pixelated-icon' : ''} />
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
                        <input
                            type="text"
                            placeholder="Søg efter ikon..."
                            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 mb-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-2 pr-1 custom-scrollbar">
                            {filteredIcons
                                .map((icon) => (
                                    <IconChoice key={icon} icon={`${icon}.png`} />
                                ))}
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default ChestIconPicker;
