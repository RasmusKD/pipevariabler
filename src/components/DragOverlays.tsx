// Custom drag overlays rendered at the app root so they survive tab switches.
// Both track the real cursor via pointer events instead of solid-dnd's
// transform, so the preview stays glued to the cursor.
import { useDragDropContext } from '@thisbeyond/solid-dnd';
import {
    createEffect, createMemo, createSignal, onCleanup, onMount, Show, type Component,
} from 'solid-js';
import { isChestDragId } from '../dnd/ids';
import { pointerPosition } from '../dnd/pointer';
import { useApp } from '../stores/app-store';
import { useDrag } from '../stores/drag-store';
import SpriteIcon from './SpriteIcon';

/** Track the cursor while `isActive` holds; snaps to the cursor when it turns on */
const createCursorPosition = (isActive: () => boolean) => {
    const [pos, setPos] = createSignal({ x: 0, y: 0 });

    onMount(() => {
        const handler = (e: PointerEvent) => {
            if (isActive()) setPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('pointermove', handler);
        onCleanup(() => window.removeEventListener('pointermove', handler));
    });

    createEffect(() => {
        if (isActive()) setPos({ x: pointerPosition.x, y: pointerPosition.y });
    });

    return pos;
};

/** Dragged item(s): icon centered on the cursor, with a multi-select count badge */
const ItemDragOverlay: Component = () => {
    const drag = useDrag();
    const pos = createCursorPosition(() => drag.isDragging() && drag.activeItem() !== null);

    return (
        <Show when={drag.activeItem()}>
            {(item) => (
                <div
                    class="pointer-events-none fixed z-[9999]"
                    style={{
                        left: `${pos().x}px`,
                        top: `${pos().y}px`,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <SpriteIcon icon={item().image} size={48} class="drop-shadow-xl" />
                    <Show when={drag.draggedItems().length > 1}>
                        <div class="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                            {drag.draggedItems().length}
                        </div>
                    </Show>
                </div>
            )}
        </Show>
    );
};

/**
 * Dragged chest: a DOM CLONE of the real chest, offset to where it was
 * grabbed. A clone (rather than rendering a live <Chest>) is deliberate:
 * a live component would register draggables/droppables with the same ids as
 * the real chest and unregister the real ones when the overlay unmounts.
 * The clone is inert markup - that bug class is impossible.
 */
const ChestDragOverlay: Component = () => {
    const app = useApp();
    const dndContext = useDragDropContext();
    const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
    // Measured from the grabbed chest - grid cells are minmax(330px, 1fr), so
    // the real width varies with the viewport
    const [dragSize, setDragSize] = createSignal({ width: 330, height: 268 });
    const [previewHtml, setPreviewHtml] = createSignal('');

    const isChestDrag = createMemo(() => isChestDragId(dndContext?.[0]?.active.draggableId));
    const pos = createCursorPosition(isChestDrag);

    // The chest may already have been moved to another tab mid-drag - search
    // all tabs, and keep the position live so the "#n" badge updates
    const activeChest = createMemo(() => {
        const draggableId = dndContext?.[0]?.active.draggableId;
        if (!isChestDragId(draggableId)) return null;
        for (const tab of app.state.tabs) {
            const index = tab.chests.findIndex((c) => c.id === draggableId);
            if (index !== -1) return { chest: tab.chests[index], index };
        }
        return null;
    });

    // Capture the grab offset when the drag starts
    createEffect(() => {
        const draggableId = dndContext?.[0]?.active.draggableId;
        if (!isChestDragId(draggableId)) return;
        const el = document.querySelector<HTMLElement>(`[data-chest-id="${draggableId}"]`);
        if (el) {
            const rect = el.getBoundingClientRect();
            setDragOffset({ x: pointerPosition.x - rect.left, y: pointerPosition.y - rect.top });
            setDragSize({ width: rect.width, height: rect.height });
        }
    });

    // (Re)clone the chest markup - re-runs when the chest's position/tab
    // changes mid-drag so the #n badge stays current
    createEffect(() => {
        const active = activeChest();
        if (!active) {
            setPreviewHtml('');
            return;
        }
        void active.index; // track position changes
        // The wrapper matches first; the INNER chest div is the visual card
        const wrapper = document.querySelector(`[data-chest-id="${active.chest.id}"]`);
        const card = wrapper?.querySelector(`[data-chest-id="${active.chest.id}"]`) ?? wrapper;
        setPreviewHtml(card?.outerHTML ?? '');
    });

    return (
        <Show when={activeChest()}>
            <div
                class="pointer-events-none fixed z-[9999]"
                style={{
                    left: `${pos().x - dragOffset().x}px`,
                    top: `${pos().y - dragOffset().y}px`,
                    width: `${dragSize().width}px`,
                    height: `${dragSize().height}px`,
                    opacity: 0.95,
                }}
                innerHTML={previewHtml()}
            />
        </Show>
    );
};

const DragOverlays: Component = () => (
    <>
        <ItemDragOverlay />
        <ChestDragOverlay />
    </>
);

export default DragOverlays;
