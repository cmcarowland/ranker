declare module 'node:crypto' {
	export function randomUUID(): string;
	export function randomBytes(size: number): { toString: (encoding: string) => string };
	export function createHash(algorithm: string): {
		update: (data: string) => { digest: (encoding: string) => string };
		digest: (encoding: string) => string;
	};
}

declare module 'node:fs/promises' {
	export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	export function readFile(path: string, encoding: string): Promise<string>;
	export function rename(oldPath: string, newPath: string): Promise<void>;
	export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}

declare module 'node:path' {
	const path: {
		join: (...parts: string[]) => string;
	};
	export default path;
}

declare const process: {
	cwd: () => string;
	env: Record<string, string | undefined>;
};
