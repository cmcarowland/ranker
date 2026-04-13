<script lang="ts">
	import type { PublicUserBoardSummary } from '$lib/types';

	export let data: {
		viewer: {
			handle: string;
			displayName: string;
			email: string;
		} | null;
		users: PublicUserBoardSummary[];
	};

	let searchQuery = '';
	let searchFilter: 'any' | 'username' | 'handle' | 'topCoaster' = 'any';

	$: normalizedQuery = searchQuery.trim().toLowerCase();
	$: filteredUsers = data.users.filter((user) => {
		if (!normalizedQuery) {
			return true;
		}

		if (searchFilter === 'username') {
			return user.displayName.toLowerCase().includes(normalizedQuery);
		}

		if (searchFilter === 'handle') {
			return user.handle.toLowerCase().includes(normalizedQuery);
		}

		if (searchFilter === 'topCoaster') {
			return (user.topCoasterName ?? '').toLowerCase().includes(normalizedQuery);
		}

		return [user.displayName, user.handle, user.topCoasterName ?? '']
			.join(' ')
			.toLowerCase()
			.includes(normalizedQuery);
	});
</script>

<main class="directory-page">
	<section class="directory-header">
		<div>
			<h1>Rider Directory</h1>
			<p>Browse public rankings and open any rider's board.</p>
		</div>
		<div class="header-actions">
			{#if data.viewer}
				<a href={`/u/${data.viewer.handle}`}>Go to your board</a>
			{:else}
				<a href="/login">Log in</a>
			{/if}
		</div>
	</section>

	<section class="directory-list" aria-label="Users and top coasters">
		<div class="directory-controls">
			<label>
				<span>Search</span>
				<input
					type="search"
					bind:value={searchQuery}
					placeholder="Name, handle, or #1 coaster"
				/>
			</label>

			<label>
				<span>Filter by</span>
				<select bind:value={searchFilter}>
					<option value="any">Any</option>
					<option value="username">Username</option>
					<option value="handle">Handle</option>
					<option value="topCoaster">Top Coaster</option>
				</select>
			</label>
		</div>

		{#if data.users.length === 0}
			<p class="empty">No users found yet.</p>
		{:else if filteredUsers.length === 0}
			<p class="empty">No users match this search.</p>
		{:else}
			{#each filteredUsers as user (user.handle)}
				<article class="user-row">
					<div class="user-meta">
						<h2>{user.displayName}</h2>
						<p>@{user.handle}</p>
					</div>
					<div class="top-coaster">
						<span class="label">#1 Coaster</span>
						<strong>{user.topCoasterName ?? 'No ranked coaster yet'}</strong>
					</div>
					<div class="view-action">
						<a href={`/u/${user.handle}`}>View</a>
					</div>
				</article>
			{/each}
		{/if}
	</section>
</main>

<style>
	.directory-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1.5rem;
		display: grid;
		gap: 1rem;
	}

	.directory-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
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

	.directory-list {
		display: grid;
		gap: 0.7rem;
	}

	.directory-controls {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) minmax(170px, 220px);
		gap: 0.7rem;
	}

	.directory-controls label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: #d5d9e1;
	}

	.directory-controls input,
	.directory-controls select {
		padding: 0.5rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #586171;
		background: #2a2e35;
		color: #f3f5f8;
	}

	.user-row {
		padding: 0.85rem 1rem;
		border: 1px solid #434955;
		border-radius: 12px;
		background: #262a31;
		display: grid;
		grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) auto;
		gap: 0.7rem;
		align-items: center;
	}

	.user-meta h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.user-meta p {
		margin: 0.2rem 0 0;
		font-size: 0.9rem;
		color: #9faac0;
	}

	.top-coaster .label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #9ca8bc;
	}

	.top-coaster strong {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.95rem;
	}

	a {
		display: inline-block;
		text-decoration: none;
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		border-radius: 8px;
		padding: 0.45rem 0.65rem;
	}

	.empty {
		padding: 1rem;
		border: 1px dashed #6d7c96;
		border-radius: 12px;
		margin: 0;
	}

	@media (max-width: 760px) {
		.directory-controls {
			grid-template-columns: 1fr;
		}

		.user-row {
			grid-template-columns: 1fr;
		}
	}
</style>
