<script lang="ts">
	import { dev } from '$app/environment';
	import DropZoneColumn from '$lib/components/DropZoneColumn.svelte';
	import type { BoardData, Coaster, ColumnId, GUID, Park } from '$lib/types';

	export let initialBoard: BoardData;
	export let canEdit = false;
	export let ownerHandle: string;
	export let onSave: ((board: BoardData) => Promise<void>) | undefined = undefined;

	let board: BoardData = structuredClone(initialBoard);
	let lastInitialBoard = initialBoard;
	let parkFilter: GUID | 'all' = 'all';
	let importStatus = '';
	let saveStatus = '';
	let isSaving = false;

	let draggedCoasterId: GUID | null = null;
	let draggedFromColumn: ColumnId | null = null;
	let hoveredRiddenCoasterId: GUID | null = null;
	let hoveredRiddenPosition: 'before' | 'after' = 'before';

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
		hoveredRiddenCoasterId = null;
		hoveredRiddenPosition = 'before';
	}

	$: {
		if (!canEdit) {
			resetDragState();
		} else if (
			draggedCoasterId &&
			draggedFromColumn === 'ridden' &&
			hoveredRiddenCoasterId &&
			hoveredRiddenCoasterId !== draggedCoasterId
		) {
			const currentIndex = board.columns.ridden.indexOf(draggedCoasterId);
			const hoveredIndex = board.columns.ridden.indexOf(hoveredRiddenCoasterId);

			if (currentIndex >= 0 && hoveredIndex >= 0 && currentIndex !== hoveredIndex) {
				const nextRidden = [...board.columns.ridden];
				nextRidden.splice(currentIndex, 1);
				const nextHoveredIndex = nextRidden.indexOf(hoveredRiddenCoasterId);

				if (nextHoveredIndex >= 0) {
					const insertIndex = hoveredRiddenPosition === 'after' ? nextHoveredIndex + 1 : nextHoveredIndex;
					if (nextRidden[insertIndex] !== draggedCoasterId && nextRidden[insertIndex - 1] !== draggedCoasterId) {
						nextRidden.splice(insertIndex, 0, draggedCoasterId);
						board = {
							...board,
							columns: {
								...board.columns,
								ridden: nextRidden
							}
						};

						recalculateRanks();
					}
				}
			}
		}
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
		if (!canEdit || !draggedCoasterId || !draggedFromColumn) {
			return;
		}

		if (toColumn === 'ridden' && draggedFromColumn === 'ridden') {
			recalculateRanks();
			resetDragState();
			return;
		}

		if (toColumn === draggedFromColumn && beforeCoasterId === null) {
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
		hoveredRiddenCoasterId = null;
		hoveredRiddenPosition = 'before';
	}

	function setHoveredCoasterWhileDragging(toColumn: ColumnId, coasterId: GUID, position: 'before' | 'after'): void {
		if (!canEdit || toColumn !== 'ridden' || draggedFromColumn !== 'ridden') {
			return;
		}

		hoveredRiddenCoasterId = coasterId;
		hoveredRiddenPosition = position;
	}

	function isBoardData(value: unknown): value is BoardData {
		if (!value || typeof value !== 'object') {
			return false;
		}

		const candidate = value as Partial<BoardData>;
		return (
			Array.isArray(candidate.parks) &&
			Array.isArray(candidate.coasters) &&
			typeof candidate.columns === 'object' &&
			candidate.columns !== null &&
			Array.isArray(candidate.columns.unridden) &&
			Array.isArray(candidate.columns.ridden)
		);
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
			<h1>{ownerHandle}'s Coaster Ranker</h1>
			<p>Drag cards between unridden and ridden. Reorder ridden cards to set global and per-park rankings.</p>
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

	<section class="board">
		<DropZoneColumn
			title="Unridden"
			columnId="unridden"
			coasterIds={visibleUnridden}
			visibleCount={visibleUnridden.length}
			totalCount={board.columns.unridden.length}
			emptyMessage="No coasters match this filter."
			{draggedCoasterId}
			showRanks={false}
			{canEdit}
			{getCoasterById}
			{getParkById}
			onColumnDrop={moveCoaster}
			onCardDropBefore={moveCoaster}
			onCardDragHover={setHoveredCoasterWhileDragging}
			onCardDragStart={startDraggingCoaster}
			onCardDragEnd={resetDragState} />

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

	.readonly {
		color: #ffcc81;
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

	.save-tools {
		display: grid;
		gap: 0.45rem;
		min-width: 230px;
	}

	.action {
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		border-radius: 8px;
		padding: 0.45rem 0.65rem;
		cursor: pointer;
	}

	.action:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.action:hover:enabled {
		background: #354055;
	}

	.file-upload {
		display: grid;
		gap: 0.2rem;
		font-size: 0.85rem;
		color: #d5d9e1;
	}

	.file-upload input {
		color: #cdd5e4;
	}

	.dropzone {
		border: 1px dashed #6f7f99;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		font-size: 0.84rem;
		color: #bfc9da;
	}

	.status {
		color: #9cc5a9;
	}

	.board {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
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
