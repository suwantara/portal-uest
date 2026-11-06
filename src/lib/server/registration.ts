import { sql } from 'drizzle-orm';
import { ALLOW_REGISTRATION } from '$app/env/private';
import { db } from './db/index.ts';
import { user } from './db/schema.ts';

/**
 * Public registration is always allowed while the database has no users, so the
 * first owner can bootstrap a fresh deployment. After that, it is controlled by
 * ALLOW_REGISTRATION (default: false).
 */
export async function isRegistrationEnabled(): Promise<boolean> {
	if (ALLOW_REGISTRATION) return true;

	const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(user);

	return Number(row?.count ?? 0) === 0;
}
