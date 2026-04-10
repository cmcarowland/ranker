<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let code = '';
	let sent = false;
	let sending = false;
	let verifying = false;
	let errorMessage = '';
	let statusMessage = '';

	async function requestCode(): Promise<void> {
		errorMessage = '';
		statusMessage = '';
		sending = true;

		try {
			const response = await fetch('/auth/send-code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			const payload = (await response.json()) as { error?: string };

			if (!response.ok) {
				throw new Error(payload.error ?? 'Failed to send login code.');
			}

			sent = true;
			statusMessage = 'Code sent. Check your email.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to send login code.';
		} finally {
			sending = false;
		}
	}

	async function verifyCode(): Promise<void> {
		errorMessage = '';
		statusMessage = '';
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
				};
			};

			if (!response.ok || !payload.user) {
				throw new Error(payload.error ?? 'Verification failed.');
			}

			await goto(`/u/${payload.user.handle}`);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Verification failed.';
		} finally {
			verifying = false;
		}
	}
</script>

<main class="auth-page">
	<section class="panel">
		<h1>Login</h1>
		<p>Enter your email to receive a 6-digit login code. Codes expire in 5 minutes.</p>

		<form class="stack" on:submit|preventDefault={requestCode}>
			<label>
				<span>Email</span>
				<input type="email" bind:value={email} required placeholder="you@example.com" />
			</label>
			<button type="submit" disabled={sending || !email}>
				{sending ? 'Sending...' : sent ? 'Resend code' : 'Send code'}
			</button>
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
