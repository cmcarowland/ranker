import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OTP_RESEND_INTERVAL_MS, generateOtpCode } from '$lib/server/auth';
import { sendLoginCodeEmail } from '$lib/server/mail';
import { getOtpChallenge, upsertOtpChallenge } from '$lib/server/storage';
import { isValidEmail, normalizeEmail } from '$lib/server/users';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as { email?: string } | null;
	const email = normalizeEmail(body?.email ?? '');

	if (!isValidEmail(email)) {
		return json({ error: 'Please enter a valid email address.' }, { status: 400 });
	}

	const existing = await getOtpChallenge(email);
	if (existing) {
		const msSinceLastSend = Date.now() - new Date(existing.lastSentAt).getTime();
		if (msSinceLastSend < OTP_RESEND_INTERVAL_MS) {
			return json({ error: 'Please wait before requesting another code.' }, { status: 429 });
		}
	}

	const code = generateOtpCode();
	await upsertOtpChallenge(email, code);

	try {
		await sendLoginCodeEmail(email, code);
		return json({ ok: true });
	} catch (error) {
		console.error(error);
		return json({ error: 'Unable to send login code right now.' }, { status: 500 });
	}
};
