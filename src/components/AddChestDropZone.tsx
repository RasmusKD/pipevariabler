import React from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { FaPlus } from 'react-icons/fa';

interface AddChestDropZoneProps {
    onAddChest: () => void;
}

// Drop zone for creating new chests - can drag item here to create chest with that item
const AddChestDropZone: React.FC<AddChestDropZoneProps> = ({ onAddChest }) => {
    const { active } = useDndContext();
    const { setNodeRef, isOver } = useDroppable({
        id: 'add-chest-drop-zone',
    });

    const isDraggingItem = active && typeof active.id === 'string';
    const showItemHighlight = isDraggingItem && isOver;

    return (
        <div
            ref={setNodeRef}
            onClick={onAddChest}
            className={`flex items-center justify-center border-2 border-dashed rounded p-4 min-h-[200px] transition-colors cursor-pointer ${showItemHighlight
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900'
                }`}
        >
            <div className="flex flex-col items-center gap-3 p-6 text-neutral-400">
                <FaPlus size={24} />
                <span className="text-lg font-medium">
                    {showItemHighlight
                        ? 'Slip for at oprette kiste'
                        : 'Tilføj kiste'}
                </span>
            </div>
        </div>
    );
};

export default AddChestDropZone;
