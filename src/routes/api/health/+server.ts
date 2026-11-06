import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	await db.execute(sql`select 1`);

	return Response.json({ status: 'ok' });
};
