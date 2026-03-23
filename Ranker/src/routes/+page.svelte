<script lang="ts">
    import { initialBoardData } from '$lib/data';
    import type { BoardData, Coaster, ColumnId, GUID, Park } from '$lib/types';

    let board: BoardData = structuredClone(initialBoardData);
    let parkFilter: GUID | 'all' = 'all';

    let draggedCoasterId: GUID | null = null;
    let draggedFromColumn: ColumnId | null = null;

    function getParkById(parkId: GUID): Park | undefined {
        return board.parks.find((park) => park.id === parkId);
    }

    function getCoasterById(coasterId: GUID): Coaster | undefined {
        return board.coasters.find((coaster) => coaster.id === coasterId);
    }

    function coasterMatchesFilter(coasterId: GUID): boolean {
        if (parkFilter === 'all') {
            return true;
        }

        return getCoasterById(coasterId)?.homeParkId === parkFilter;
    }

    $: visibleUnridden = board.columns.unridden.filter(coasterMatchesFilter);
    $: visibleRidden = board.columns.ridden.filter(coasterMatchesFilter);

    function resetDragState(): void {
        draggedCoasterId = null;
        draggedFromColumn = null;
    }

    function recalculateRanks(): void {
        for (const coasterId of board.columns.unridden) {
            const coaster = getCoasterById(coasterId);
            if (!coaster) {
                continue;
            }

            coaster.ridden = false;
            coaster.globalRank = null;
            coaster.parkRank = null;
        }

        const parkRankCounter = new Map<GUID, number>();

        for (let index = 0; index < board.columns.ridden.length; index += 1) {
            const coasterId = board.columns.ridden[index];
            const coaster = getCoasterById(coasterId);
            if (!coaster) {
                continue;
            }

            coaster.ridden = true;
            coaster.globalRank = index + 1;

            const nextParkRank = (parkRankCounter.get(coaster.homeParkId) ?? 0) + 1;
            parkRankCounter.set(coaster.homeParkId, nextParkRank);
            coaster.parkRank = nextParkRank;
        }

        board = {
            ...board,
            coasters: [...board.coasters],
            columns: {
                unridden: [...board.columns.unridden],
                ridden: [...board.columns.ridden]
            }
        };
    }

    function moveCoaster(toColumn: ColumnId, beforeCoasterId: GUID | null = null): void {
        if (!draggedCoasterId || !draggedFromColumn) {
            return;
        }

        const nextColumns = {
            unridden: [...board.columns.unridden],
            ridden: [...board.columns.ridden]
        };

        for (const column of ['unridden', 'ridden'] as const) {
            const index = nextColumns[column].indexOf(draggedCoasterId);
            if (index >= 0) {
                nextColumns[column].splice(index, 1);
            }
        }

        const destination = nextColumns[toColumn];
        const insertIndex = beforeCoasterId ? destination.indexOf(beforeCoasterId) : -1;

        if (insertIndex === -1) {
            destination.push(draggedCoasterId);
        } else {
            destination.splice(insertIndex, 0, draggedCoasterId);
        }

        board = {
            ...board,
            columns: nextColumns
        };

        recalculateRanks();
        resetDragState();
    }

    function handleCardDragStart(event: DragEvent, coasterId: GUID, fromColumn: ColumnId): void {
        draggedCoasterId = coasterId;
        draggedFromColumn = fromColumn;

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', coasterId);
        }
    }

    function handleDragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    recalculateRanks();
</script>

<main class="page">
    <section class="toolbar">
        <div class="title-wrap">
            <h1>Coaster Ranker</h1>
            <p>Drag cards between unridden and ridden. Reorder ridden cards to set your global and per-park rankings.</p>
        </div>

        <label class="filter">
            <span>Filter by park</span>
            <select bind:value={parkFilter}>
                <option value="all">All parks</option>
                {#each board.parks as park (park.id)}
                    <option value={park.id}>{park.name}</option>
                {/each}
            </select>
        </label>
    </section>

    <section class="board">
        <article
            class="column"
            on:dragover={handleDragOver}
            on:drop={() => moveCoaster('unridden')}>
            <header>
                <h2>Unridden</h2>
                <small>{visibleUnridden.length} visible / {board.columns.unridden.length} total</small>
            </header>

            <div class="cards">
                {#if visibleUnridden.length === 0}
                    <p class="empty">No coasters match this filter.</p>
                {/if}

                {#each visibleUnridden as coasterId (coasterId)}
                    {@const coaster = getCoasterById(coasterId)}
                    {#if coaster}
                        <div
                            role="listitem"
                            class="card {draggedCoasterId === coaster.id ? 'dragging' : ''}"
                            draggable="true"
                            on:dragstart={(event) => handleCardDragStart(event, coaster.id, 'unridden')}
                            on:dragend={resetDragState}
                            on:dragover={handleDragOver}
                            on:drop={() => moveCoaster('unridden', coaster.id)}>
                            <div class="card-title">{coaster.name}</div>
                            <div class="meta">{coaster.type} • {getParkById(coaster.homeParkId)?.name}</div>
                        </div>
                    {/if}
                {/each}
            </div>
        </article>

        <article
            class="column"
            on:dragover={handleDragOver}
            on:drop={() => moveCoaster('ridden')}>
            <header>
                <h2>Ridden</h2>
                <small>{visibleRidden.length} visible / {board.columns.ridden.length} total</small>
            </header>

            <div class="cards">
                {#if visibleRidden.length === 0}
                    <p class="empty">Drop coasters here to rank them.</p>
                {/if}

                {#each visibleRidden as coasterId (coasterId)}
                    {@const coaster = getCoasterById(coasterId)}
                    {#if coaster}
                        <div
                            role="listitem"
                            class="card ranked {draggedCoasterId === coaster.id ? 'dragging' : ''}"
                            draggable="true"
                            on:dragstart={(event) => handleCardDragStart(event, coaster.id, 'ridden')}
                            on:dragend={resetDragState}
                            on:dragover={handleDragOver}
                            on:drop={() => moveCoaster('ridden', coaster.id)}>
                            <div class="card-title">{coaster.name}</div>
                            <div class="meta">{coaster.type} • {getParkById(coaster.homeParkId)?.name}</div>
                            <div class="ranks">
                                <span>Overall #{coaster.globalRank}</span>
                                <span>Park #{coaster.parkRank}</span>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </article>
    </section>

    <section class="json-panel">
        <h3>Current JSON snapshot</h3>
        <pre>{JSON.stringify(board, null, 2)}</pre>
    </section>
</main>

<style>
    :global(body) {
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #1d1f23 0%, #2a2d33 100%);
        color: #e6e8ec;
    }

    .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1.5rem;
        display: grid;
        gap: 1rem;
    }

    .toolbar {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
        padding: 1rem;
        background: rgba(36, 39, 45, 0.92);
        border: 1px solid #434955;
        border-radius: 12px;
    }

    h1 {
        margin: 0;
        font-size: 1.8rem;
    }

    p {
        margin: 0.35rem 0 0;
        color: #bcc4d1;
    }

    .filter {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
        color: #d5d9e1;
    }

    select {
        padding: 0.5rem 0.65rem;
        border-radius: 8px;
        border: 1px solid #586171;
        background: #2a2e35;
        color: #f3f5f8;
    }

    .board {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }

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

    .empty {
        color: #9ca8bc;
        font-size: 0.9rem;
        margin: 0.3rem 0;
    }

    .json-panel {
        padding: 0.85rem;
        background: #161a22;
        border: 1px solid #3b414e;
        border-radius: 12px;
        color: #d7e0f2;
        overflow: auto;
    }

    h3 {
        margin-top: 0;
    }

    pre {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.35;
    }

    @media (max-width: 900px) {
        .toolbar {
            grid-template-columns: 1fr;
            display: grid;
        }

        .board {
            grid-template-columns: 1fr;
        }
    }
</style>
