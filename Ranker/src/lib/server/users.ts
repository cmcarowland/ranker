// @ts-ignore - Node builtin module types are not available in this environment.
import { randomUUID } from 'node:crypto';
import type { User } from '$lib/types';

const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 40;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function slugify(input: string): string {
	const slug = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

	return slug || 'user';
}

export function deriveHandleFromEmail(email: string): string {
	const [localPart] = normalizeEmail(email).split('@');
	return slugify(localPart ?? 'user');
}

export function buildUniqueHandleFromEmail(email: string, existingUsers: User[]): string {
	const base = deriveHandleFromEmail(email);
	const existing = new Set(existingUsers.map((user) => user.handle));

	if (!existing.has(base)) {
		return base;
	}

	let counter = 2;
	while (existing.has(`${base}-${counter}`)) {
		counter += 1;
	}

	return `${base}-${counter}`;
}

export function normalizeDisplayName(displayName: string): string {
	return displayName.trim().replace(/\s+/g, ' ');
}

export function isValidDisplayName(displayName: string): boolean {
	const normalized = normalizeDisplayName(displayName);
	return (
		normalized.length >= MIN_DISPLAY_NAME_LENGTH &&
		normalized.length <= MAX_DISPLAY_NAME_LENGTH
	);
}

export function createUser(email: string, displayName: string, existingUsers: User[]): User {
	const now = new Date().toISOString();
	const normalizedEmail = normalizeEmail(email);
	const normalizedDisplayName = normalizeDisplayName(displayName);

	return {
		id: randomUUID(),
		email: normalizedEmail,
		displayName: normalizedDisplayName,
		handle: buildUniqueHandleFromEmail(normalizedEmail, existingUsers),
		createdAt: now,
		lastLoginAt: now
	};
}
