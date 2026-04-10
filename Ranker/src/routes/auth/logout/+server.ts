import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearSession } from '$lib/server/storage';

const SESSION_COOKIE = 'ranker_session';

export const POST: RequestHandler = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) {
		await clearSession(token);
	}

	cookies.set(SESSION_COOKIE, '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 0
	});

	return json({ ok: true });
};
