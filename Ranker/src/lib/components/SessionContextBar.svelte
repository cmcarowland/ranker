<script lang="ts">
	type Viewer = {
		handle: string;
		displayName: string;
	} | null;

	export let viewer: Viewer = null;
	export let canOpenProfile = false;
	export let onOpenProfile: (() => void) | undefined = undefined;
	export let detailLines: string[] = [];
	export let showBackToUsers = false;
	export let showGoToBoard = false;
	export let showLoginAction = false;
	export let loginLabel = 'Log in';
	export let showLogoutAction = false;
	export let onLogout: (() => void) | undefined = undefined;
</script>

<section class="context-bar">
	<div class="context-copy">
		{#if viewer}
			<p>
				Signed in as <strong>@{viewer.handle}</strong>
				{#if canOpenProfile}
					<button type="button" class="name-btn" on:click={() => onOpenProfile?.()}>
						({viewer.displayName})
					</button>
				{:else}
					<span>({viewer.displayName})</span>
				{/if}
			</p>
		{:else}
			<p>You are viewing in public mode.</p>
		{/if}

		{#each detailLines as line}
			<p>{line}</p>
		{/each}
	</div>

	<div class="context-actions">
		{#if showBackToUsers}
			<a href="/users">Back to users</a>
		{/if}

		{#if showGoToBoard && viewer}
			<a href={`/u/${viewer.handle}`}>Go to your board</a>
		{/if}

		{#if showLoginAction}
			<a href="/login">{loginLabel}</a>
		{/if}

		{#if showLogoutAction && viewer}
			<button type="button" on:click={() => onLogout?.()}>Log out</button>
		{/if}
	</div>
</section>

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
		color: var(--color-text-label);
	}

	.context-actions {
		display: flex;
		gap: 0.7rem;
		align-items: center;
	}

	a,
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		min-height: 2.1rem;
		border: 1px solid var(--color-border-action);
		background: var(--color-surface-action);
		color: var(--color-text-primary);
		border-radius: 8px;
		padding: 0.4rem 0.6rem;
		text-decoration: none;
		font: inherit;
		line-height: 1;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
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
</style>
