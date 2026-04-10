<script lang="ts">
	import { goto } from '$app/navigation';
	import BoardWorkspace from '$lib/components/BoardWorkspace.svelte';
	import type { BoardData } from '$lib/types';

	export let data: {
		user: {
			handle: string;
			email: string;
		} | null;
		owner: {
			handle: string;
		};
		board: BoardData;
		updatedAt: string;
		canEdit: boolean;
	};

	let saveError = '';

	async function saveBoard(board: BoardData): Promise<void> {
		saveError = '';
		const response = await fetch(`/api/boards/${data.owner.handle}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ board })
		});

		const payload = (await response.json()) as { error?: string; updatedAt?: string };
		if (!response.ok) {
			const message = payload.error ?? 'Unable to save rankings.';
			saveError = message;
			throw new Error(message);
		}

		if (payload.updatedAt) {
			data.updatedAt = payload.updatedAt;
		}
	}

	async function logout(): Promise<void> {
		await fetch('/auth/logout', {
			method: 'POST'
		});
		await goto('/login');
	}
</script>

<section class="context-bar">
	<div class="context-copy">
		{#if data.user}
			<p>Signed in as <strong>{data.user.handle}</strong>.</p>
		{:else}
			<p>You are viewing in public mode.</p>
		{/if}
		<p>Last saved: {new Date(data.updatedAt).toLocaleString()}</p>
	</div>
	<div class="context-actions">
		{#if data.user && !data.canEdit}
			<a href={`/u/${data.user.handle}`}>Go to your rankings</a>
		{/if}
		{#if !data.user}
			<a href="/login">Log in to edit your rankings</a>
		{:else}
			<button type="button" on:click={logout}>Log out</button>
		{/if}
	</div>
</section>

{#if saveError}
	<p class="error">{saveError}</p>
{/if}

<BoardWorkspace initialBoard={data.board} canEdit={data.canEdit} ownerHandle={data.owner.handle} onSave={saveBoard} />

<style>
	.context-bar {
		max-width: 1100px;
		margin: 1.25rem auto 0;
		padding: 0 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.context-copy p {
		margin: 0;
		color: #d2d8e4;
	}

	.context-actions {
		display: flex;
		gap: 0.7rem;
		align-items: center;
	}

	a,
	button {
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		border-radius: 8px;
		padding: 0.4rem 0.6rem;
		text-decoration: none;
		cursor: pointer;
	}

	.error {
		max-width: 1100px;
		margin: 0.6rem auto 0;
		padding: 0 1.5rem;
		color: #ff9c93;
	}
</style>
