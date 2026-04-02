<script lang="ts">
    import type { Coaster, ColumnId, GUID } from '$lib/types';

    export let coaster: Coaster;
    export let parkName: string | undefined;
    export let fromColumn: ColumnId;
    export let isDragging = false;
    export let showRanks = false;
    export let onDragStart: (coasterId: GUID, fromColumn: ColumnId) => void;
    export let onDragEnd: () => void;
    export let onDropBefore: (beforeCoasterId: GUID) => void;
    export let onDragHover: (coasterId: GUID, position: 'before' | 'after') => void;

    function handleDragStart(event: DragEvent): void {
        onDragStart(coaster.id, fromColumn);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', coaster.id);
        }
    }

    function handleDragEnd(): void {
        onDragEnd();
    }

    function handleDragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        const target = event.currentTarget as HTMLElement | null;
        if (!target) {
            return;
        }

        const rect = target.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position: 'before' | 'after' = event.clientY < midpoint ? 'before' : 'after';

        onDragHover(coaster.id, position);
    }

    function handleDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        onDropBefore(coaster.id);
    }
</script>

<div
    role="listitem"
    class="card {showRanks ? 'ranked' : ''} {isDragging ? 'dragging' : ''}"
    draggable="true"
    on:dragstart={handleDragStart}
    on:dragend={handleDragEnd}
    on:dragover={handleDragOver}
    on:drop={handleDrop}>
    <div class="card-title">{coaster.name}</div>
    <div class="meta">{coaster.type} • {parkName}</div>
    {#if showRanks}
        <div class="ranks">
            <span>Overall #{coaster.globalRank}</span>
            <span>Park #{coaster.parkRank}</span>
        </div>
    {/if}
</div>

<style>
    .card {
        background: #343943;
        border: 1px solid #505a6b;
        border-left: 4px solid #7da0e8;
        border-radius: 10px;
        padding: 0.7rem;
        cursor: grab;
        user-select: none;
    }

    .card.ranked {
        border-left-color: #45b487;
    }

    .card.dragging {
        opacity: 0.35;
    }

    .card-title {
        font-weight: 600;
        font-size: 1rem;
    }

    .meta {
        font-size: 0.85rem;
        color: #bdc6d5;
        margin-top: 0.2rem;
    }

    .ranks {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.45rem;
        font-size: 0.8rem;
    }

    .ranks span {
        background: #232833;
        border: 1px solid #485269;
        border-radius: 999px;
        padding: 0.12rem 0.5rem;
    }
</style>
