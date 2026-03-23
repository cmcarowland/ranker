<script lang="ts">
    import CoasterCard from '$lib/components/CoasterCard.svelte';
    import type { Coaster, ColumnId, GUID, Park } from '$lib/types';

    export let title: string;
    export let columnId: ColumnId;
    export let coasterIds: GUID[];
    export let visibleCount: number;
    export let totalCount: number;
    export let emptyMessage: string;
    export let draggedCoasterId: GUID | null = null;
    export let showRanks = false;

    export let getCoasterById: (coasterId: GUID) => Coaster | undefined;
    export let getParkById: (parkId: GUID) => Park | undefined;

    export let onColumnDrop: (toColumn: ColumnId) => void;
    export let onCardDropBefore: (toColumn: ColumnId, beforeCoasterId: GUID) => void;
    export let onCardDragStart: (coasterId: GUID, fromColumn: ColumnId) => void;
    export let onCardDragEnd: () => void;

    function handleDragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDrop(event: DragEvent): void {
        event.preventDefault();
        onColumnDrop(columnId);
    }

    function handleCardDropBefore(beforeCoasterId: GUID): void {
        onCardDropBefore(columnId, beforeCoasterId);
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
                    onDragStart={onCardDragStart}
                    onDragEnd={onCardDragEnd}
                    onDropBefore={handleCardDropBefore} />
            {/if}
        {/each}
    </div>
</article>

<style>
    .column {
        background: #262a31;
        border: 1px solid #414753;
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
        color: #9ca8bc;
        font-size: 0.9rem;
        margin: 0.3rem 0;
    }
</style>
