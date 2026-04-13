<script lang="ts">
	import { goto } from '$app/navigation';
	import BoardWorkspace from '$lib/components/BoardWorkspace.svelte';
	import type { BoardData } from '$lib/types';

	export let data: {
		viewer: {
			handle: string;
			displayName: string;
			email: string;
		} | null;
		owner: {
			handle: string;
			displayName: string;
			email: string | null;
		};
		board: BoardData;
		updatedAt: string;
		canEdit: boolean;
	};

	let saveError = '';
	let modalOpen = false;
	let editingProfile = false;
	let pendingDisplayName = '';
	let savingProfile = false;
	let profileError = '';

	function openProfileModal(): void {
		modalOpen = true;
	}

	function closeProfileModal(): void {
		modalOpen = false;
		cancelEditProfile();
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && modalOpen) {
			closeProfileModal();
		}
	}

	function startEditProfile(): void {
		editingProfile = true;
		pendingDisplayName = data.owner.displayName;
		profileError = '';
	}

	function cancelEditProfile(): void {
		editingProfile = false;
		pendingDisplayName = '';
		profileError = '';
	}

	async function saveDisplayName(): Promise<void> {
		profileError = '';
		savingProfile = true;

		try {
			const response = await fetch(`/api/profiles/${data.owner.handle}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ displayName: pendingDisplayName })
			});

			const payload = (await response.json()) as {
				error?: string;
				user?: {
					displayName: string;
				};
			};

			if (!response.ok) {
				throw new Error(payload.error ?? 'Unable to update display name.');
			}

			if (payload.user) {
				data.owner.displayName = payload.user.displayName;
				if (data.viewer) {
					data.viewer.displayName = payload.user.displayName;
				}
			}

			editingProfile = false;
			pendingDisplayName = '';
		} catch (error) {
			profileError = error instanceof Error ? error.message : 'Unable to update display name.';
		} finally {
			savingProfile = false;
		}
	}

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
		window.location.href = '/login';
	}
</script>

{#if modalOpen && data.canEdit}
	<div class="modal-overlay" on:click|self={closeProfileModal} on:keydown={handleKeyDown} role="presentation">
		<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-header">
				<h2 id="modal-title">Profile</h2>
				<button type="button" class="close-btn" on:click={closeProfileModal} aria-label="Close">
					×
				</button>
			</div>
			<div class="modal-body">
				<div class="profile-info">
					<div class="profile-field">
						<div class="field-label">Email</div>
						<p>{data.owner.email}</p>
					</div>
					<div class="profile-field">
						<div class="field-label">Handle</div>
						<p>@{data.owner.handle}</p>
					</div>
					<div class="profile-field">
						<div class="field-label">Display Name</div>
						{#if editingProfile}
							<form class="edit-form" on:submit|preventDefault={saveDisplayName}>
								<input
									type="text"
									bind:value={pendingDisplayName}
									required
									minlength="2"
									maxlength="40"
								/>
								<div class="edit-actions">
									<button type="submit" disabled={savingProfile || pendingDisplayName.trim().length < 2}>
										{savingProfile ? 'Saving...' : 'Save'}
									</button>
									<button type="button" on:click={cancelEditProfile} disabled={savingProfile}>
										Cancel
									</button>
								</div>
							</form>
						{:else}
							<div class="display-name-row">
								<p>{data.owner.displayName}</p>
								<button type="button" class="edit-btn" on:click={startEditProfile}>
									Edit
								</button>
							</div>
						{/if}
					</div>
				</div>
				{#if profileError}
					<p class="profile-error">{profileError}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<section class="context-bar">
	<div class="context-copy">
		{#if data.viewer}
			<p>
				Signed in as <strong>@{data.viewer.handle}</strong> 
				{#if data.canEdit}
					<button type="button" class="name-btn" on:click={openProfileModal}>
						({data.viewer.displayName})
					</button>
				{:else}
					<span>({data.viewer.displayName})</span>
				{/if}
			</p>
		{:else}
			<p>You are viewing in public mode.</p>
		{/if}
		<p>
			Viewing <strong>{data.owner.displayName}</strong>'s rankings (@{data.owner.handle}).
		</p>
		<p>Last saved: {new Date(data.updatedAt).toLocaleString()}</p>
	</div>
	<div class="context-actions">
		<a href="/users">Back to users</a>
		{#if !data.viewer}
			<a href="/login">Log in to edit your rankings</a>
		{:else}
			<button type="button" on:click={logout}>Log out</button>
		{/if}
	</div>
</section>

{#if saveError}
	<p class="error">{saveError}</p>
{/if}

<BoardWorkspace
	initialBoard={data.board}
	canEdit={data.canEdit}
	ownerDisplayName={data.owner.displayName}
	onSave={saveBoard}
/>

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

	.name-btn {
		background: none;
		border: none;
		color: inherit;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
		font-size: inherit;
	}

	.name-btn:hover {
		opacity: 0.8;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: rgba(36, 39, 45, 0.95);
		border: 1px solid #434955;
		border-radius: 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		max-width: 400px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		border-bottom: 1px solid #434955;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #e6e8ec;
	}

	.close-btn {
		background: none;
		border: none;
		color: #d2d8e4;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #f1f4fa;
	}

	.modal-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 1.25rem;
	}

	.profile-info {
		display: grid;
		gap: 0.75rem;
	}

	.profile-field {
		display: grid;
		gap: 0.25rem;
	}

	.field-label {
		font-size: 0.85rem;
		color: #9ca3af;
		font-weight: 500;
	}

	.profile-field p {
		margin: 0;
		color: #e6e8ec;
	}

	.display-name-row {
		display: grid;
		gap: 0.35rem;
		margin-top: 0.35rem;
		justify-items: start;
	}

	.edit-form {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}

	.edit-form input {
		padding: 0.5rem;
		border-radius: 4px;
		border: 1px solid #586171;
		background: #2a2e35;
		color: #f3f5f8;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.edit-actions button {
		flex: 1;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.edit-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.profile-error {
		color: #ff9c93;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}
</style>
