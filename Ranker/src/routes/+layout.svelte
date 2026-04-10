<svelte:head>
	<title>Ranker</title>
</svelte:head>

<main>
	<slot />
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background: linear-gradient(135deg, #1d1f23 0%, #2a2d33 100%);
		color: #e6e8ec;
	}

	main {
		min-height: 100vh;
	}
</style>
