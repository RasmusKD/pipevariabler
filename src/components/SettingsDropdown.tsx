import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaCaretDown, FaFileImport, FaFileExport, FaUserPlus, FaUndo, FaRedo, FaBook } from 'react-icons/fa';

interface SettingsDropdownProps {
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onNewProfile: () => void;
    onLoadPreset: (presetName: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    undoDisabled: boolean;
    redoDisabled: boolean;
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
    onImport,
    onExport,
    onNewProfile,
    onLoadPreset,
    onUndo,
    onRedo,
    undoDisabled,
    redoDisabled,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Hidden file input - outside dropdown so it persists */}
            <input
                type="file"
                onChange={(e) => {
                    onImport(e);
                    // Reset input so same file can be selected again
                    e.target.value = '';
                }}
                className="hidden"
                accept="application/json"
                id="import-profile"
            />
            <button
                className="flex items-center gap-2 p-2 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <FaCog className="text-neutral-300" />
                <FaCaretDown className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 text-white rounded-lg shadow-xl overflow-hidden">
                    {/* Profile Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                        Profil
                    </div>
                    <div className="p-1">
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const input = document.getElementById('import-profile') as HTMLInputElement;
                                if (input) {
                                    input.click();
                                }
                            }}
                        >
                            <FaFileImport className="text-blue-400" />
                            <span>Importer Profil</span>
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors"
                            onClick={() => {
                                onExport();
                                setIsOpen(false);
                            }}
                        >
                            <FaFileExport className="text-green-400" />
                            <span>Eksporter Profil</span>
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors"
                            onClick={() => {
                                onNewProfile();
                                setIsOpen(false);
                            }}
                        >
                            <FaUserPlus className="text-purple-400" />
                            <span>Ny Profil</span>
                        </button>
                    </div>

                    {/* Presets Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-t border-neutral-800">
                        Skabeloner
                    </div>
                    <div className="p-1">
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors"
                            onClick={() => {
                                onLoadPreset('ivers_kisterum');
                                setIsOpen(false);
                            }}
                        >
                            <FaBook className="text-cyan-400" />
                            <span>Ivers Kisterum</span>
                            <span className="ml-auto text-xs text-neutral-500">142 kister</span>
                        </button>
                    </div>

                    {/* Actions Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-t border-neutral-800">
                        Handlinger
                    </div>
                    <div className="p-1">
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => {
                                onUndo();
                                setIsOpen(false);
                            }}
                            disabled={undoDisabled}
                        >
                            <FaUndo className="text-amber-400" />
                            <span>Fortryd</span>
                            <kbd className="ml-auto text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">Ctrl+Z</kbd>
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => {
                                onRedo();
                                setIsOpen(false);
                            }}
                            disabled={redoDisabled}
                        >
                            <FaRedo className="text-amber-400" />
                            <span>Gentag</span>
                            <kbd className="ml-auto text-xs text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">Ctrl+Y</kbd>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsDropdown;
