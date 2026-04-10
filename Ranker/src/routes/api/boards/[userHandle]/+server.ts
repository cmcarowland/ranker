import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isBoardData } from '$lib/server/board';
import { findUserByHandle, getOrCreateBoard, upsertBoard } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
	const user = await findUserByHandle(params.userHandle);
	if (!user) {
		return json({ error: 'User board not found.' }, { status: 404 });
	}

	const userBoard = await getOrCreateBoard(user.id);

	return json({
		owner: {
			handle: user.handle,
			displayName: user.displayName
		},
		board: userBoard.board,
		updatedAt: userBoard.updatedAt
	});
};

export const PUT: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) {
		return json({ error: 'You must be logged in to edit rankings.' }, { status: 401 });
	}

	if (locals.user.handle !== params.userHandle) {
		return json({ error: 'You can only edit your own rankings.' }, { status: 403 });
	}

	const body = (await request.json().catch(() => null)) as { board?: unknown } | null;
	if (!body || !isBoardData(body.board)) {
		return json({ error: 'Invalid board payload.' }, { status: 400 });
	}

	const updated = await upsertBoard(locals.user.id, body.board);

	return json({
		ok: true,
		updatedAt: updated.updatedAt
	});
};
