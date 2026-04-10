import type { Handle } from '@sveltejs/kit';
import { clearSession, findUserById, getSession } from '$lib/server/storage';

const SESSION_COOKIE = 'ranker_session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const session = await getSession(token);

		if (!session) {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		} else {
			const user = await findUserById(session.userId);
			if (!user) {
				await clearSession(token);
				event.cookies.delete(SESSION_COOKIE, { path: '/' });
			} else {
				event.locals.user = {
					id: user.id,
					email: user.email,
					handle: user.handle
				};
			}
		}
	}

	return resolve(event);
};
