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
	ridden: boolean;
	parkRank: number | null;
	globalRank: number | null;
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
