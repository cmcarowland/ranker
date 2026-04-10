import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findUserByHandle, getOrCreateBoard } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, locals }) => {
	const owner = await findUserByHandle(params.userHandle);
	if (!owner) {
		throw error(404, 'User board not found');
	}

	const board = await getOrCreateBoard(owner.id);
	const canEdit = locals.user?.id === owner.id;

	return {
		owner: {
			handle: owner.handle
		},
		board: board.board,
		updatedAt: board.updatedAt,
		canEdit
	};
};
