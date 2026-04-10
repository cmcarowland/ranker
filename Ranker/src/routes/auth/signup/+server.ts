import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUserAccount, getOrCreateBoard } from '$lib/server/storage';
import { isValidDisplayName, isValidEmail, normalizeDisplayName, normalizeEmail } from '$lib/server/users';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as
		| {
				email?: string;
				displayName?: string;
		  }
		| null;

	const email = normalizeEmail(body?.email ?? '');
	const displayName = normalizeDisplayName(body?.displayName ?? '');

	if (!isValidEmail(email)) {
		return json({ error: 'Please enter a valid email address.' }, { status: 400 });
	}

	if (!isValidDisplayName(displayName)) {
		return json({ error: 'Please enter a display name between 2 and 40 characters.' }, { status: 400 });
	}

	const created = await createUserAccount(email, displayName);
	if (!created) {
		return json({ error: 'An account with this email already exists.' }, { status: 409 });
	}

	await getOrCreateBoard(created.id);

	return json({
		ok: true,
		user: {
			handle: created.handle,
			displayName: created.displayName,
			email: created.email
		}
	});
};
