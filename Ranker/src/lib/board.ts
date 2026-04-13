import type { BoardData } from '$lib/types';

export function isBoardData(value: unknown): value is BoardData {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<BoardData>;

	return (
		Array.isArray(candidate.parks) &&
		Array.isArray(candidate.coasters) &&
		typeof candidate.columns === 'object' &&
		candidate.columns !== null &&
		Array.isArray(candidate.columns.unridden) &&
		Array.isArray(candidate.columns.ridden)
	);
}