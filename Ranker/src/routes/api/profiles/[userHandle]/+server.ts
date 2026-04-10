import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByHandle, updateUserDisplayName } from '$lib/server/storage';
import { isValidDisplayName, normalizeDisplayName } from '$lib/server/users';

export const PUT: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'You must be logged in to edit your profile.' }, { status: 401 });
	}

	if (locals.user.handle !== params.userHandle) {
		return json({ error: 'You can only edit your own profile.' }, { status: 403 });
	}

	const body = (await request.json().catch(() => null)) as { displayName?: string } | null;
	const displayName = normalizeDisplayName(body?.displayName ?? '');

	if (!isValidDisplayName(displayName)) {
		return json({ error: 'Please enter a display name between 2 and 40 characters.' }, { status: 400 });
	}

	const owner = await findUserByHandle(params.userHandle);
	if (!owner) {
		return json({ error: 'User not found.' }, { status: 404 });
	}

	const updated = await updateUserDisplayName(owner.id, displayName);
	if (!updated) {
		return json({ error: 'User not found.' }, { status: 404 });
	}

	return json({
		ok: true,
		user: {
			handle: updated.handle,
			displayName: updated.displayName,
			email: updated.email
		}
	});
};
