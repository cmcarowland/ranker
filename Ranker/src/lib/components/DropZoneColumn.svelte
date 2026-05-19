<script lang="ts">
    import CoasterCard from './CoasterCard.svelte';
    import type { Coaster, ColumnId, GUID, Park } from '$lib/types';

    export let title: string;
    export let columnId: ColumnId;
    export let coasterIds: GUID[];
    export let visibleCount: number;
    export let totalCount: number;
    export let emptyMessage: string;
    export let draggedCoasterId: GUID | null = null;
    export let showRanks = false;
    export let canEdit = true;

    export let getCoasterById: (coasterId: GUID) => Coaster | undefined;
    export let getParkById: (parkId: GUID) => Park | undefined;

    export let onColumnDrop: (toColumn: ColumnId) => void;
    export let onCardDropBefore: (toColumn: ColumnId, beforeCoasterId: GUID) => void;
    export let onCardDragHover: (toColumn: ColumnId, coasterId: GUID, position: 'before' | 'after') => void;
    export let onCardDragStart: (coasterId: GUID, fromColumn: ColumnId) => void;
    export let onCardDragEnd: () => void;

    function handleDragOver(event: DragEvent): void {
        if (!canEdit) {
            return;
        }

        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDrop(event: DragEvent): void {
        if (!canEdit) {
            return;
        }

        event.preventDefault();
        onColumnDrop(columnId);
    }

    function handleCardDropBefore(beforeCoasterId: GUID): void {
        onCardDropBefore(columnId, beforeCoasterId);
    }

    function handleCardDragHover(coasterId: GUID, position: 'before' | 'after'): void {
        onCardDragHover(columnId, coasterId, position);
    }
</script>

<article class="column" on:dragover={handleDragOver} on:drop={handleDrop}>
    <header>
        <h2>{title}</h2>
        <small>{visibleCount} visible / {totalCount} total</small>
    </header>

    <div class="cards">
        {#if coasterIds.length === 0}
            <p class="empty">{emptyMessage}</p>
        {/if}

        {#each coasterIds as coasterId (coasterId)}
            {@const coaster = getCoasterById(coasterId)}
            {#if coaster}
                <CoasterCard
                    {coaster}
                    parkName={getParkById(coaster.homeParkId)?.name}
                    fromColumn={columnId}
                    isDragging={draggedCoasterId === coaster.id}
                    {showRanks}
                    {canEdit}
                    onDragStart={onCardDragStart}
                    onDragEnd={onCardDragEnd}
                    onDragHover={handleCardDragHover}
                    onDropBefore={handleCardDropBefore} />
            {/if}
        {/each}
    </div>
</article>

<style>
    .column {
        background: var(--color-surface-card);
        border: 1px solid var(--color-border-default);
        border-radius: 12px;
        padding: 0.85rem;
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 420px;
    }

    .column header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 0.6rem;
    }

    h2 {
        margin: 0;
    }

    .cards {
        display: grid;
        gap: 0.55rem;
        align-content: start;
    }

    .empty {
        color: var(--color-text-subtle);
        font-size: 0.9rem;
        margin: 0.3rem 0;
    }
</style>
