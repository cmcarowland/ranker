// @ts-ignore - Node builtin module types are not available in this environment.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
// @ts-ignore - Node builtin module types are not available in this environment.
import path from 'node:path';
// @ts-ignore - Node builtin module types are not available in this environment.
import { randomUUID } from 'node:crypto';
import { initialBoardData } from '$lib/data';
import type { BoardData, OtpChallenge, PublicUserBoardSummary, Session, User, UserBoard } from '$lib/types';
import {
	expiresInFromNow,
	generateSessionToken,
	hashOtpCode,
	isExpired,
	OTP_LIFETIME_MS,
	SESSION_LIFETIME_MS
} from '$lib/server/auth';
import {
	createUser,
	deriveHandleFromEmail,
	normalizeDisplayName,
	normalizeEmail
} from '$lib/server/users';

declare const process: {
	cwd: () => string;
};

interface PersistedDb {
	users: User[];
	sessions: Session[];
	otpChallenges: OtpChallenge[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'ranker-auth.json');
const PARKS_PATH = path.join(DATA_DIR, 'parks.json');
const COASTERS_PATH = path.join(DATA_DIR, 'coasters.json');

const EMPTY_DB: PersistedDb = {
	users: [],
	sessions: [],
	otpChallenges: []
};

let writeQueue: Promise<void> = Promise.resolve();

async function ensureParksAndCoastersFiles(): Promise<void> {
	try {
		await readFile(PARKS_PATH, 'utf8');
	} catch {
		// Create parks file from initial data
		await writeFile(PARKS_PATH, JSON.stringify(initialBoardData.parks, null, 2), 'utf8');
	}

	try {
		await readFile(COASTERS_PATH, 'utf8');
	} catch {
		// Create coasters file from initial data
		await writeFile(COASTERS_PATH, JSON.stringify(initialBoardData.coasters, null, 2), 'utf8');
	}
}

async function loadParks() {
	try {
		const raw = await readFile(PARKS_PATH, 'utf8');
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

async function loadCoasters() {
	try {
		const raw = await readFile(COASTERS_PATH, 'utf8');
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

async function ensureDbFile(): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });
	await ensureParksAndCoastersFiles();

	try {
		await readFile(DB_PATH, 'utf8');
	} catch {
		await writeFile(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), 'utf8');
	}
}

function sanitizeDb(db: PersistedDb): PersistedDb {
	const usedHandles = new Set<string>();
	const users = Array.isArray(db.users)
		? db.users.map((entry) => {
			const normalizedDisplayName = normalizeDisplayName(entry.displayName ?? entry.handle ?? 'User');
			const normalizedEmail = normalizeEmail(entry.email ?? '');
			const baseHandle = deriveHandleFromEmail(normalizedEmail);
			let normalizedHandle = baseHandle;
			let counter = 2;

			while (usedHandles.has(normalizedHandle)) {
				normalizedHandle = `${baseHandle}-${counter}`;
				counter += 1;
			}

			usedHandles.add(normalizedHandle);

			return {
				...entry,
				email: normalizedEmail,
				handle: normalizedHandle,
				displayName: normalizedDisplayName || entry.handle || 'User'
			};
		})
		: [];

	return {
		users,
		sessions: Array.isArray(db.sessions) ? db.sessions : [],
		otpChallenges: Array.isArray(db.otpChallenges) ? db.otpChallenges : []
	};
}

async function readDb(): Promise<PersistedDb> {
	await ensureDbFile();

	try {
		const raw = await readFile(DB_PATH, 'utf8');
		const parsed = JSON.parse(raw) as PersistedDb;
		return sanitizeDb(parsed);
	} catch {
		return { ...EMPTY_DB };
	}
}

async function writeDb(db: PersistedDb): Promise<void> {
	await ensureDbFile();
	const tempPath = `${DB_PATH}.${randomUUID()}.tmp`;

	await writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8');
	await rename(tempPath, DB_PATH);
}

async function mutateDb<T>(mutator: (db: PersistedDb) => T): Promise<T> {
	let result!: T;

	writeQueue = writeQueue.then(async () => {
		const db = await readDb();
		result = mutator(db);
		await writeDb(db);
	});

	await writeQueue;
	return result;
}

function cleanupExpiredRecords(db: PersistedDb): void {
	db.sessions = db.sessions.filter((session) => !isExpired(session.expiresAt));
	db.otpChallenges = db.otpChallenges.filter((challenge) => !isExpired(challenge.expiresAt));
}

export async function findUserByHandle(handle: string): Promise<User | null> {
	const db = await readDb();
	cleanupExpiredRecords(db);
	const user = db.users.find((entry) => entry.handle === handle);
	return user ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
	const normalized = normalizeEmail(email);
	const db = await readDb();
	cleanupExpiredRecords(db);
	const user = db.users.find((entry) => entry.email === normalized);
	return user ?? null;
}

export async function findUserById(userId: string): Promise<User | null> {
	const db = await readDb();
	cleanupExpiredRecords(db);
	const user = db.users.find((entry) => entry.id === userId);
	return user ?? null;
}

export async function getPublicUserBoardSummaries(): Promise<PublicUserBoardSummary[]> {
	const db = await readDb();
	cleanupExpiredRecords(db);

	const coasters = (await loadCoasters()) as Array<{ id?: string; name?: string }>;
	const coasterNamesById = new Map<string, string>();

	for (const coaster of coasters) {
		if (typeof coaster.id === 'string' && typeof coaster.name === 'string') {
			coasterNamesById.set(coaster.id, coaster.name);
		}
	}

	const summaries = await Promise.all(
		db.users.map(async (user) => {
			let topCoasterName: string | null = null;
			const boardFilePath = path.join(DATA_DIR, `${user.id}.json`);

			try {
				const raw = await readFile(boardFilePath, 'utf8');
				const boardData = JSON.parse(raw) as { columns?: { ridden?: unknown[] } };
				const topRidden = boardData.columns?.ridden?.[0];
				if (typeof topRidden === 'string') {
					topCoasterName = coasterNamesById.get(topRidden) ?? null;
				}
			} catch {
				topCoasterName = null;
			}

			return {
				handle: user.handle,
				displayName: user.displayName,
				topCoasterName
			};
		})
	);

	return summaries.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.handle.localeCompare(b.handle));
}

export async function createUserAccount(email: string, displayName: string): Promise<User | null> {
	const normalized = normalizeEmail(email);
	const normalizedDisplayName = normalizeDisplayName(displayName);

	return mutateDb((db) => {
		cleanupExpiredRecords(db);
		const existing = db.users.find((entry) => entry.email === normalized);
		if (existing) {
			return null;
		}

		const created = createUser(normalized, normalizedDisplayName, db.users);
		db.users.push(created);
		return created;
	});
}

export async function touchUserLastLogin(userId: string): Promise<void> {
	await mutateDb((db) => {
		cleanupExpiredRecords(db);
		const user = db.users.find((entry) => entry.id === userId);
		if (!user) {
			return;
		}

		user.lastLoginAt = new Date().toISOString();
	});
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<User | null> {
	const normalizedDisplayName = normalizeDisplayName(displayName);

	return mutateDb((db) => {
		cleanupExpiredRecords(db);
		const user = db.users.find((entry) => entry.id === userId);
		if (!user) {
			return null;
		}

		user.displayName = normalizedDisplayName;
		return user;
	});
}

export async function upsertOtpChallenge(email: string, code: string): Promise<OtpChallenge> {
	const normalized = normalizeEmail(email);

	return mutateDb((db) => {
		cleanupExpiredRecords(db);
		const now = new Date().toISOString();
		const challenge: OtpChallenge = {
			email: normalized,
			codeHash: hashOtpCode(code),
			createdAt: now,
			expiresAt: expiresInFromNow(OTP_LIFETIME_MS),
			lastSentAt: now,
			attempts: 0
		};

		db.otpChallenges = db.otpChallenges.filter((entry) => entry.email !== normalized);
		db.otpChallenges.push(challenge);
		return challenge;
	});
}

export async function getOtpChallenge(email: string): Promise<OtpChallenge | null> {
	const normalized = normalizeEmail(email);
	const db = await readDb();
	cleanupExpiredRecords(db);
	const challenge = db.otpChallenges.find((entry) => entry.email === normalized);

	if (challenge) {
		await writeDb(db);
	}

	return challenge ?? null;
}

export async function bumpOtpAttempts(email: string): Promise<number> {
	const normalized = normalizeEmail(email);

	return mutateDb((db) => {
		cleanupExpiredRecords(db);
		const challenge = db.otpChallenges.find((entry) => entry.email === normalized);
		if (!challenge) {
			return 0;
		}

		challenge.attempts += 1;
		return challenge.attempts;
	});
}

export async function clearOtpChallenge(email: string): Promise<void> {
	const normalized = normalizeEmail(email);
	await mutateDb((db) => {
		cleanupExpiredRecords(db);
		db.otpChallenges = db.otpChallenges.filter((entry) => entry.email !== normalized);
	});
}

export async function createSession(userId: string): Promise<Session> {
	return mutateDb((db) => {
		cleanupExpiredRecords(db);
		const now = new Date().toISOString();
		const session: Session = {
			token: generateSessionToken(),
			userId,
			createdAt: now,
			expiresAt: expiresInFromNow(SESSION_LIFETIME_MS)
		};

		db.sessions.push(session);
		return session;
	});
}

export async function getSession(token: string): Promise<Session | null> {
	const db = await readDb();
	cleanupExpiredRecords(db);
	const session = db.sessions.find((entry) => entry.token === token);

	if (session) {
		await writeDb(db);
	}

	return session ?? null;
}

export async function clearSession(token: string): Promise<void> {
	await mutateDb((db) => {
		cleanupExpiredRecords(db);
		db.sessions = db.sessions.filter((entry) => entry.token !== token);
	});
}

export async function getOrCreateBoard(userId: string): Promise<UserBoard> {
	// Load shared parks and coasters
	const parks = await loadParks();
	const coasters = await loadCoasters();

	// Check if user board file exists
	const boardFilePath = path.join(DATA_DIR, `${userId}.json`);
	let columns;
	let lastSaved = new Date().toISOString();

	try {
		const raw = await readFile(boardFilePath, 'utf8');
		const boardData = JSON.parse(raw) as { columns: { unridden: string[]; ridden: string[] }; lastSaved?: string };
		columns = boardData.columns;
		lastSaved = boardData.lastSaved ?? lastSaved;
	} catch {
		// Create new default board with all coasters in unridden
		columns = {
			unridden: initialBoardData.coasters.map((c) => c.id),
			ridden: []
		};
		await mkdir(DATA_DIR, { recursive: true });
		await writeFile(
			boardFilePath,
			JSON.stringify({ columns, lastSaved }, null, 2),
			'utf8'
		);
	}

	// Reconstruct full board with current parks and coasters
	return {
		userId,
		board: {
			parks,
			coasters,
			columns
		},
		updatedAt: lastSaved
	};
}

export async function upsertBoard(userId: string, board: BoardData): Promise<UserBoard> {
	// Load shared parks and coasters
	const parks = await loadParks();
	const coasters = await loadCoasters();

	// Write columns and lastSaved timestamp to individual user file
	const boardFilePath = path.join(DATA_DIR, `${userId}.json`);
	const now = new Date().toISOString();
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(
		boardFilePath,
		JSON.stringify({ columns: board.columns, lastSaved: now }, null, 2),
		'utf8'
	);

	return {
		userId,
		board: {
			parks,
			coasters,
			columns: board.columns
		},
		updatedAt: now
	};
}
