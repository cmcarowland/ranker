import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OTP_MAX_ATTEMPTS, hashOtpCode, isExpired } from '$lib/server/auth';
import {
	bumpOtpAttempts,
	clearOtpChallenge,
	createSession,
	findUserByEmail,
	getOtpChallenge,
	touchUserLastLogin
} from '$lib/server/storage';
import { isValidEmail, normalizeEmail } from '$lib/server/users';

const SESSION_COOKIE = 'ranker_session';
const SESSION_MAX_AGE_SECONDS = 48 * 60 * 60;

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const body = (await request.json().catch(() => null)) as { email?: string; code?: string } | null;
	const email = normalizeEmail(body?.email ?? '');
	const code = (body?.code ?? '').trim();

	if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
		return json({ error: 'Invalid email or verification code.' }, { status: 400 });
	}

	const challenge = await getOtpChallenge(email);
	if (!challenge) {
		return json({ error: 'No login code found. Request a new one.' }, { status: 400 });
	}

	if (isExpired(challenge.expiresAt)) {
		await clearOtpChallenge(email);
		return json({ error: 'This login code has expired. Request a new one.' }, { status: 400 });
	}

	if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
		await clearOtpChallenge(email);
		return json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
	}

	const incomingHash = hashOtpCode(code);
	if (incomingHash !== challenge.codeHash) {
		const attempts = await bumpOtpAttempts(email);
		if (attempts >= OTP_MAX_ATTEMPTS) {
			await clearOtpChallenge(email);
			return json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
		}

		return json({ error: 'Incorrect verification code.' }, { status: 400 });
	}

	await clearOtpChallenge(email);
	const user = await findUserByEmail(email);
	if (!user) {
		return json({ error: 'No account found for this email. Please sign up first.' }, { status: 404 });
	}

	await touchUserLastLogin(user.id);
	const session = await createSession(user.id);

	cookies.set(SESSION_COOKIE, session.token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: SESSION_MAX_AGE_SECONDS
	});

	return json({
		ok: true,
		user: {
			handle: user.handle,
			displayName: user.displayName,
			email: user.email
		}
	});
};
