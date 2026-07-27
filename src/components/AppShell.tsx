// AppShell - layout, keyboard shortcuts, drag wiring and global modals.
// Kept in its own module (separate from the providers in App.tsx) so hot
// reload never re-creates a context consumer before its provider.
import { useDragDropContext } from '@thisbeyond/solid-dnd';
import { onCleanup, onMount, Show, type Component } from 'solid-js';
import { CHEST_HIGHLIGHT_MS } from '../constants';
import { createDragHandlers } from '../dnd/drag-handlers';
import { useApp } from '../stores/app-store';
import { useDrag } from '../stores/drag-store';
import ChestGrid from './ChestGrid';
import ConfirmationModal from './ConfirmationModal';
import DragOverlays from './DragOverlays';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import TabDropOverlay from './TabDropOverlay';

const AppShell: Component = () => {
    const app = useApp();
    const drag = useDrag();
    const [, { onDragStart, onDragEnd }] = useDragDropContext()!;

    const handlers = createDragHandlers(app, drag);
    onDragStart(handlers.onDragStart);
    onDragEnd(handlers.onDragEnd);

    // Undo/redo keyboard shortcuts
    onMount(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
            if (e.key === 'z') {
                e.preventDefault();
                app.undo();
            } else if (e.key === 'y') {
                e.preventDefault();
                app.redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
    });

    // Sidebar badge click: jump to the chest (switching tab if needed) and flash it
    const handleChestClick = (chestId: number) => {
        const tab = app.state.tabs.find((t) => t.chests.some((c) => c.id === chestId));
        if (!tab) return;
        if (tab.id !== app.state.activeTabId) app.setActiveTabId(tab.id);

        // Let the tab switch render before scrolling
        setTimeout(() => {
            const chestElement = document.querySelector<HTMLElement>(`[data-chest-id="${chestId}"]`);
            if (!chestElement) return;
            chestElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            chestElement.classList.add('ring-2', 'ring-inset', 'ring-blue-500');
            setTimeout(
                () => chestElement.classList.remove('ring-2', 'ring-inset', 'ring-blue-500'),
                CHEST_HIGHLIGHT_MS,
            );
        }, 150);
    };

    return (
        <div class="flex flex-col h-dvh overflow-hidden bg-neutral-950 text-white">
            <div class="flex flex-1 flex-col md:flex-row min-h-0">
                <Sidebar onChestClick={handleChestClick} />

                <main class="flex-1 p-4 pl-2 flex flex-col gap-2 min-h-0 overflow-hidden">
                    <TabBar />
                    <div class="flex-1 min-h-0 overflow-auto">
                        <ChestGrid />
                    </div>
                </main>
            </div>

            {/* Root-level drag visuals - must survive tab switches */}
            <DragOverlays />
            <TabDropOverlay />

            <Show when={app.state.deleteChestModalVisible}>
                <ConfirmationModal
                    onConfirm={app.confirmDeleteChest}
                    onCancel={app.cancelDeleteChest}
                    title="Bekræft Sletning"
                    message="Er du sikker på, at du vil slette denne kiste? Den er ikke tom."
                    variant="danger"
                    confirmText="Slet"
                    cancelText="Annuller"
                />
            </Show>

            <Show when={app.state.newProfileModalVisible}>
                <ConfirmationModal
                    onConfirm={app.confirmNewProfile}
                    onCancel={app.cancelNewProfile}
                    title="Ny Profil"
                    message="Er du sikker på at du vil oprette en ny profil? Dette vil slette alt nuværende data."
                    variant="warning"
                    confirmText="Opret Ny"
                    cancelText="Annuller"
                />
            </Show>
        </div>
    );
};

export default AppShell;
