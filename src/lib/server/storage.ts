import { eq, sql } from 'drizzle-orm';
import { STORAGE_QUOTA_BYTES } from '$app/env/private';
import { db } from './db/index.ts';
import { document, project } from './db/schema.ts';

export type StorageSummary = {
	used: number;
	limit: number;
	remaining: number;
	percent: number;
};

export async function getStorageUsage(workspaceId: string): Promise<number> {
	const [row] = await db
		.select({
			used: sql<string>`coalesce(sum(${document.size}), 0)::bigint`
		})
		.from(document)
		.innerJoin(project, eq(document.projectId, project.id))
		.where(eq(project.workspaceId, workspaceId));

	return Number(row?.used ?? 0);
}

export async function getStorageSummary(workspaceId: string): Promise<StorageSummary> {
	const used = await getStorageUsage(workspaceId);
	const limit = STORAGE_QUOTA_BYTES;
	const remaining = Math.max(limit - used, 0);
	const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

	return { used, limit, remaining, percent };
}
