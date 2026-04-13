<script lang="ts">
	import { dev } from '$app/environment';
	import { isBoardData } from '$lib/board';
	import DropZoneColumn from '$lib/components/DropZoneColumn.svelte';
	import type { BoardData, Coaster, ColumnId, GUID, Park } from '$lib/types';

	export let initialBoard: BoardData;
	export let canEdit = false;
	export let ownerDisplayName: string;
	export let onSave: ((board: BoardData) => Promise<void>) | undefined = undefined;

	let board: BoardData = structuredClone(initialBoard);
	let lastInitialBoard = initialBoard;
	let parkFilter: GUID | 'all' = 'all';
	let importStatus = '';
	let saveStatus = '';
	let isSaving = false;

	let draggedCoasterId: GUID | null = null;
	let draggedFromColumn: ColumnId | null = null;
	let hoveredCoasterId: GUID | null = null;
	let hoveredPosition: 'before' | 'after' = 'before';
	let hoveredColumn: ColumnId | null = null;

	$: if (initialBoard !== lastInitialBoard) {
		lastInitialBoard = initialBoard;
		board = structuredClone(initialBoard);
		recalculateRanks();
	}

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
		hoveredCoasterId = null;
		hoveredPosition = 'before';
		hoveredColumn = null;
	}

	$: {
		if (!canEdit) {
			resetDragState();
		} else if (
			draggedCoasterId &&
			draggedFromColumn &&
			hoveredColumn === draggedFromColumn &&
			hoveredCoasterId &&
			hoveredCoasterId !== draggedCoasterId
		) {
			const sourceColumn = draggedFromColumn;
			const currentIndex = board.columns[sourceColumn].indexOf(draggedCoasterId);
			const hoveredIndex = board.columns[sourceColumn].indexOf(hoveredCoasterId);

			if (currentIndex >= 0 && hoveredIndex >= 0 && currentIndex !== hoveredIndex) {
				const nextColumnItems = [...board.columns[sourceColumn]];
				nextColumnItems.splice(currentIndex, 1);
				const nextHoveredIndex = nextColumnItems.indexOf(hoveredCoasterId);

				if (nextHoveredIndex >= 0) {
					const insertIndex = hoveredPosition === 'after' ? nextHoveredIndex + 1 : nextHoveredIndex;
					if (
						nextColumnItems[insertIndex] !== draggedCoasterId &&
						nextColumnItems[insertIndex - 1] !== draggedCoasterId
					) {
						nextColumnItems.splice(insertIndex, 0, draggedCoasterId);
						board = {
							...board,
							columns: {
								...board.columns,
								[sourceColumn]: nextColumnItems
							}
						};

						recalculateRanks();
					}
				}
			}
		}
	}

	function recalculateRanks(): void {
		for (let index = 0; index < board.columns.unridden.length; index += 1) {
			const coasterId = board.columns.unridden[index];
			const coaster = getCoasterById(coasterId);
			if (!coaster) {
				continue;
			}

			coaster.ridden = false;
			coaster.globalRank = index + 1;
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
		if (!canEdit || !draggedCoasterId || !draggedFromColumn) {
			return;
		}

		if (toColumn === draggedFromColumn) {
			recalculateRanks();
			resetDragState();
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

	function startDraggingCoaster(coasterId: GUID, fromColumn: ColumnId): void {
		if (!canEdit) {
			return;
		}

		draggedCoasterId = coasterId;
		draggedFromColumn = fromColumn;
		hoveredCoasterId = null;
		hoveredPosition = 'before';
		hoveredColumn = null;
	}

	function setHoveredCoasterWhileDragging(toColumn: ColumnId, coasterId: GUID, position: 'before' | 'after'): void {
		if (!canEdit || !draggedFromColumn || toColumn !== draggedFromColumn) {
			return;
		}

		hoveredCoasterId = coasterId;
		hoveredPosition = position;
		hoveredColumn = toColumn;
	}

	function exportBoardJson(): void {
		if (!canEdit) {
			return;
		}

		const serialized = JSON.stringify(board, null, 2);
		const blob = new Blob([serialized], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		const dateStamp = new Date().toISOString().slice(0, 10);

		link.href = url;
		link.download = `coaster-ranker-save-${dateStamp}.json`;
		link.click();

		URL.revokeObjectURL(url);
		importStatus = 'Exported current board JSON.';
	}

	function loadBoardFromText(contents: string): void {
		if (!canEdit) {
			return;
		}

		try {
			const parsed = JSON.parse(contents);
			if (!isBoardData(parsed)) {
				importStatus = 'Import failed: file is not a valid board JSON.';
				return;
			}

			board = structuredClone(parsed);
			recalculateRanks();
			importStatus = 'Imported save successfully.';
		} catch {
			importStatus = 'Import failed: invalid JSON.';
		}
	}

	async function importFromFile(file: File | null): Promise<void> {
		if (!canEdit || !file) {
			return;
		}

		const contents = await file.text();
		loadBoardFromText(contents);
	}

	function handleFileInputChange(event: Event): void {
		if (!canEdit) {
			return;
		}

		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		void importFromFile(file);
		input.value = '';
	}

	function handleImportDrop(event: DragEvent): void {
		event.preventDefault();
		if (!canEdit) {
			return;
		}

		const file = event.dataTransfer?.files?.[0] ?? null;
		void importFromFile(file);
	}

	async function saveBoard(): Promise<void> {
		if (!canEdit || !onSave || isSaving) {
			return;
		}

		isSaving = true;
		saveStatus = '';

		try {
			await onSave(board);
			saveStatus = 'Saved rankings.';
		} catch (error) {
			saveStatus = error instanceof Error ? error.message : 'Failed to save rankings.';
		} finally {
			isSaving = false;
		}
	}

	recalculateRanks();
</script>

<main class="page">
	<section class="toolbar">
		<div class="title-wrap">
			<h1>{ownerDisplayName}'s Coaster Ranker</h1>
			<p>Drag cards between unridden and ridden. Reorder cards in either column to organize and rank coasters.</p>
			{#if !canEdit}
				<p class="readonly">Viewing only. Log in as this user to edit rankings.</p>
			{/if}
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

		{#if canEdit}
			<section class="save-tools">
				<button type="button" class="action" on:click={saveBoard} disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save rankings'}
				</button>
				<button type="button" class="action" on:click={exportBoardJson}>Export JSON</button>
				<label class="file-upload">
					<span>Import JSON</span>
					<input type="file" accept="application/json,.json" on:change={handleFileInputChange} />
				</label>
				<div role="button" tabindex="0" class="dropzone" on:dragover|preventDefault on:drop={handleImportDrop}>
					Drop exported save here
				</div>
				{#if importStatus}
					<small class="status">{importStatus}</small>
				{/if}
				{#if saveStatus}
					<small class="status">{saveStatus}</small>
				{/if}
			</section>
		{/if}
	</section>

	<section class="board" class:readonly-board={!canEdit}>
		{#if canEdit}
			<DropZoneColumn
				title="Unridden/Wishlist"
				columnId="unridden"
				coasterIds={visibleUnridden}
				visibleCount={visibleUnridden.length}
				totalCount={board.columns.unridden.length}
				emptyMessage="No coasters match this filter."
				{draggedCoasterId}
				showRanks={true}
				{canEdit}
				{getCoasterById}
				{getParkById}
				onColumnDrop={moveCoaster}
				onCardDropBefore={moveCoaster}
				onCardDragHover={setHoveredCoasterWhileDragging}
				onCardDragStart={startDraggingCoaster}
				onCardDragEnd={resetDragState} />
		{/if}

		<div class:full-span={!canEdit}>
			<DropZoneColumn
				title="Ridden"
				columnId="ridden"
				coasterIds={visibleRidden}
				visibleCount={visibleRidden.length}
				totalCount={board.columns.ridden.length}
				emptyMessage="Drop coasters here to rank them."
				{draggedCoasterId}
				showRanks={true}
				{canEdit}
				{getCoasterById}
				{getParkById}
				onColumnDrop={moveCoaster}
				onCardDropBefore={moveCoaster}
				onCardDragHover={setHoveredCoasterWhileDragging}
				onCardDragStart={startDraggingCoaster}
				onCardDragEnd={resetDragState} />
		</div>
	</section>

	{#if dev}
		<section class="json-panel">
			<h3>Current JSON snapshot</h3>
			<pre>{JSON.stringify(board, null, 2)}</pre>
		</section>
	{/if}
</main>

<style>
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
		flex-wrap: wrap;
		padding: 1rem;
		background: var(--color-surface-panel);
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
	}

	h1 {
		margin: 0;
		font-size: 1.8rem;
	}

	p {
		margin: 0.35rem 0 0;
		color: var(--color-text-base);
	}

	.readonly {
		color: var(--color-text-readonly-warning);
	}

	.filter {
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
		color: var(--color-text-label);
	}

	select {
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
		border: 1px solid var(--color-border-input);
		background: var(--color-surface-input);
		color: var(--color-text-input);
	}

	.save-tools {
		display: grid;
		gap: 0.45rem;
		min-width: 230px;
	}

	.action {
		border: 1px solid var(--color-border-action);
		background: var(--color-surface-action);
		color: var(--color-text-primary);
		border-radius: 8px;
		padding: 0.45rem 0.65rem;
		cursor: pointer;
	}

	.action:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.action:hover:enabled {
		background: var(--color-surface-action-hover);
	}

	.file-upload {
		display: grid;
		gap: 0.2rem;
		font-size: 0.85rem;
		color: var(--color-text-label);
	}

	.file-upload input {
		color: var(--color-text-input);
	}

	.dropzone {
		border: 1px dashed var(--color-border-dropzone);
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		font-size: 0.84rem;
		color: var(--color-text-dropzone);
	}

	.status {
		color: var(--color-text-success);
	}

	.board {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.readonly-board .full-span {
		grid-column: 1 / -1;
	}

	.json-panel {
		padding: 0.85rem;
		background: var(--color-surface-json);
		border: 1px solid var(--color-border-json);
		border-radius: 12px;
		color: var(--color-text-panel);
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
