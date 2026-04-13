<main class="landing">
	<section class="card">
		<h1>Coaster Ranker</h1>
		<p>Create your own coaster rankings and share them publicly with a user link.</p>
		<div class="actions">
			<a href="/login">Log in with email code</a>
			<a class="secondary" href="/login?mode=signup">Create an account</a>
		</div>
		<p class="hint">After login, you will be redirected to the users directory at /users.</p>
	</section>
</main>

<style>
	.landing {
		max-width: 760px;
		margin: 0 auto;
		padding: 2.5rem 1.25rem;
	}

	.card {
		background: rgba(36, 39, 45, 0.92);
		border: 1px solid #434955;
		border-radius: 14px;
		padding: 1.25rem;
		display: grid;
		gap: 0.75rem;
	}

	h1 {
		margin: 0;
	}

	p {
		margin: 0;
		color: #c3ccdc;
	}

	.actions {
		margin-top: 0.35rem;
	}

	a {
		display: inline-block;
		text-decoration: none;
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		border-radius: 8px;
		padding: 0.55rem 0.7rem;
		margin-right: 0.45rem;
	}

	a.secondary {
		background: #222831;
	}

	.hint {
		font-size: 0.9rem;
	}
</style>
