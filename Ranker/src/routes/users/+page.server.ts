import type { PageServerLoad } from './$types';
import { getPublicUserBoardSummaries } from '$lib/server/storage';

export const load: PageServerLoad = async ({ locals }) => {
	const allUsers = await getPublicUserBoardSummaries();
	const users = locals.user
		? allUsers.filter((user) => user.handle !== locals.user?.handle)
		: allUsers;

	return {
		viewer: locals.user,
		users
	};
};
