// @ts-ignore - Node builtin module types are not available in this environment.
import { createHash, randomBytes } from 'node:crypto';

export const OTP_LIFETIME_MS = 5 * 60 * 1000;
export const SESSION_LIFETIME_MS = 48 * 60 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_INTERVAL_MS = 60 * 1000;

export function hashOtpCode(code: string): string {
	return createHash('sha256').update(code).digest('hex');
}

export function generateOtpCode(): string {
	const value = Math.floor(Math.random() * 1_000_000);
	return value.toString().padStart(6, '0');
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

export function isExpired(isoDate: string): boolean {
	return Date.now() > new Date(isoDate).getTime();
}

export function expiresInFromNow(ms: number): string {
	return new Date(Date.now() + ms).toISOString();
}
