export type GUID = string;

export interface ParkLocation {
	city: string;
	region: string;
	country: string;
	latitude?: number;
	longitude?: number;
}

export interface Park {
	id: GUID;
	name: string;
	location: ParkLocation;
	website?: string;
	openedYear?: number;
}

export type CoasterType =
	| 'Steel'
	| 'Wooden'
	| 'Hybrid'
	| 'Launched'
	| 'Inverted'
	| 'Dive'
	| 'Hyper'
	| 'Giga'
	| 'Family'
	| 'Other';

export interface Coaster {
	id: GUID;
	name: string;
	type: CoasterType;
	homeParkId: GUID;
	primaryColor: string;
	ridden?: boolean;
	parkRank?: number | null;
	globalRank?: number | null;
	notes?: string;
}

export type ColumnId = 'unridden' | 'ridden';

export interface BoardColumns {
	unridden: GUID[];
	ridden: GUID[];
}

export interface BoardData {
	parks: Park[];
	coasters: Coaster[];
	columns: BoardColumns;
}

export interface User {
	id: GUID;
	email: string;
	displayName: string;
	handle: string;
	createdAt: string;
	lastLoginAt: string;
}

export interface Session {
	token: string;
	userId: GUID;
	createdAt: string;
	expiresAt: string;
}

export interface OtpChallenge {
	email: string;
	codeHash: string;
	createdAt: string;
	expiresAt: string;
	lastSentAt: string;
	attempts: number;
}

export interface UserBoard {
	userId: GUID;
	board: BoardData;
	updatedAt: string;
}

export interface AuthUser {
	id: GUID;
	email: string;
	displayName: string;
	handle: string;
}
