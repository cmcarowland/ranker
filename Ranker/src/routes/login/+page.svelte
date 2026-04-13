<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	type AuthMode = 'login' | 'signup';

	let mode: AuthMode = 'login';
	let email = '';
	let displayName = '';
	let code = '';
	let sent = false;
	let sending = false;
	let verifying = false;
	let registering = false;
	let signupEmailLocked = false;
	let errorMessage = '';
	let statusMessage = '';
	let lastQueryState = '';

	$: {
		const queryState = `${$page.url.searchParams.get('mode') ?? ''}|${$page.url.searchParams.get('email') ?? ''}|${$page.url.searchParams.get('prefilled') ?? ''}`;
		if (queryState !== lastQueryState) {
			lastQueryState = queryState;
			const routeMode = $page.url.searchParams.get('mode');
			const routeEmail = ($page.url.searchParams.get('email') ?? '').trim();
			const prefilled = $page.url.searchParams.get('prefilled') === '1';

			if (routeMode === 'signup') {
				mode = 'signup';
				sent = false;
				code = '';
				signupEmailLocked = prefilled;
				if (routeEmail) {
					email = routeEmail;
				}
			}
		}
	}

	function resetMessages(): void {
		errorMessage = '';
		statusMessage = '';
	}

	async function moveToSignup(prefilledEmail: string, lockEmail: boolean): Promise<void> {
		mode = 'signup';
		sent = false;
		code = '';
		signupEmailLocked = lockEmail;
		email = prefilledEmail;

		const next = `/login?mode=signup&email=${encodeURIComponent(prefilledEmail)}${lockEmail ? '&prefilled=1' : ''}`;
		await goto(next, { replaceState: true, noScroll: true, keepFocus: true });
	}

	async function moveToLogin(): Promise<void> {
		mode = 'login';
		signupEmailLocked = false;
		await goto('/login', { replaceState: true, noScroll: true, keepFocus: true });
	}

	async function requestCode(): Promise<void> {
		resetMessages();
		sending = true;

		try {
			const response = await fetch('/auth/send-code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const payload = (await response.json()) as {
				error?: string;
				requiresSignup?: boolean;
				email?: string;
			};

			if (!response.ok) {
				if (payload.requiresSignup) {
					await moveToSignup(payload.email ?? email, true);
					statusMessage = 'No account found. Complete signup to continue.';
					return;
				}

				throw new Error(payload.error ?? 'Failed to send login code.');
			}

			mode = 'login';
			sent = true;
			statusMessage = 'Code sent. Check your email.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to send login code.';
		} finally {
			sending = false;
		}
	}

	async function verifyCode(): Promise<void> {
		resetMessages();
		verifying = true;

		try {
			const response = await fetch('/auth/verify-code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, code })
			});

			const payload = (await response.json()) as {
				error?: string;
				user?: {
					handle: string;
					displayName: string;
				};
			};

			if (!response.ok || !payload.user) {
				throw new Error(payload.error ?? 'Verification failed.');
			}

			window.location.href = '/users';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Verification failed.';
		} finally {
			verifying = false;
		}
	}

	async function registerAccount(): Promise<void> {
		resetMessages();
		registering = true;

		try {
			const response = await fetch('/auth/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, displayName })
			});

			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Unable to create your account.');
			}

			statusMessage = 'Account created. Sending your login code...';
			await moveToLogin();
			await requestCode();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to create your account.';
		} finally {
			registering = false;
		}
	}
</script>

<main class="auth-page">
	<section class="panel">
		<h1>{mode === 'login' ? 'Login' : 'Sign up'}</h1>
		<p>
			{#if mode === 'login'}
				Enter your email to receive a 6-digit login code. Codes expire in 5 minutes.
			{:else}
				Create your account with an email and display name. After signup, we will email your login code.
			{/if}
		</p>

		{#if mode === 'login'}
			<form class="stack" on:submit|preventDefault={requestCode}>
				<label>
					<span>Email</span>
					<input type="email" bind:value={email} required placeholder="you@example.com" />
				</label>
				<div class="inline-actions">
					<button type="submit" disabled={sending || !email}>
						{sending ? 'Sending...' : sent ? 'Resend code' : 'Send code'}
					</button>
					<button type="button" class="secondary" on:click={() => moveToSignup(email, false)}>
						Register
					</button>
				</div>
			</form>

			{#if sent}
				<form class="stack verify" on:submit|preventDefault={verifyCode}>
					<label>
						<span>6-digit code</span>
						<input type="text" inputmode="numeric" maxlength="6" bind:value={code} required placeholder="123456" />
					</label>
					<button type="submit" disabled={verifying || code.length !== 6}>
						{verifying ? 'Verifying...' : 'Verify and continue'}
					</button>
				</form>
			{/if}
		{:else}
			<form class="stack" on:submit|preventDefault={registerAccount}>
				<label>
					<span>Email</span>
					<input
						type="email"
						bind:value={email}
						required
						placeholder="you@example.com"
						readonly={signupEmailLocked}
					/>
				</label>
				<label>
					<span>Display name</span>
					<input type="text" bind:value={displayName} required minlength="2" maxlength="40" placeholder="Your name" />
				</label>
				<div class="inline-actions">
					<button type="submit" disabled={registering || !email || displayName.trim().length < 2}>
						{registering ? 'Creating account...' : 'Create account'}
					</button>
					<button type="button" class="secondary" on:click={moveToLogin}>Back to login</button>
				</div>
			</form>
		{/if}

		{#if statusMessage}
			<p class="status">{statusMessage}</p>
		{/if}

		{#if errorMessage}
			<p class="error">{errorMessage}</p>
		{/if}
	</section>
</main>

<style>
	.auth-page {
		max-width: 560px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
	}

	.panel {
		background: rgba(36, 39, 45, 0.92);
		border: 1px solid #434955;
		border-radius: 14px;
		padding: 1.25rem;
		display: grid;
		gap: 0.85rem;
	}

	h1 {
		margin: 0;
	}

	p {
		margin: 0;
		color: #bcc4d1;
	}

	.stack {
		display: grid;
		gap: 0.5rem;
	}

	.inline-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	input {
		padding: 0.6rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #586171;
		background: #2a2e35;
		color: #f3f5f8;
	}

	button {
		border: 1px solid #6d7c96;
		background: #2d3440;
		color: #f1f4fa;
		border-radius: 8px;
		padding: 0.55rem 0.7rem;
		cursor: pointer;
	}

	button.secondary {
		background: #222831;
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.verify {
		margin-top: 0.5rem;
		padding-top: 0.65rem;
		border-top: 1px solid #444d5d;
	}

	.status {
		color: #9cc5a9;
	}

	.error {
		color: #ff9c93;
	}
</style>
