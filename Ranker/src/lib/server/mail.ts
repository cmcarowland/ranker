const RESEND_ENDPOINT = 'https://api.resend.com/emails';

declare const process: {
	env: Record<string, string | undefined>;
};

interface ResendErrorResponse {
	message?: string;
	error?: string;
}

export async function sendLoginCodeEmail(email: string, code: string): Promise<void> {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.RESEND_FROM_EMAIL;

	if (!apiKey || !from) {
		console.warn('RESEND_API_KEY or RESEND_FROM_EMAIL is missing; logging OTP in dev mode.');
		console.info(`OTP for ${email}: ${code}`);
		return;
	}

	const response = await fetch(RESEND_ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to: [email],
			subject: 'Your Ranker login code',
			html: `<p>Your login code is <strong>${code}</strong>.</p><p>This code expires in 5 minutes.</p>`
		})
	});

	if (response.ok) {
		return;
	}

	let details = 'Unknown Resend error';

	try {
		const payload = (await response.json()) as ResendErrorResponse;
		details = payload.message ?? payload.error ?? details;
	} catch {
		// Ignore JSON parse errors and keep fallback detail string.
	}

	throw new Error(`Failed to send OTP email: ${details}`);
}
