import { and, eq, lt } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from './db/index.ts';
import { activityLog, type ActivityCategory } from './db/schema.ts';
import { getRequestMeta } from './request-meta.ts';

/** Activity logs are temporary: anything older than this is removed. */
export const ACTIVITY_RETENTION_HOURS = 24;
export const ACTIVITY_RETENTION_MS = ACTIVITY_RETENTION_HOURS * 60 * 60 * 1000;

export type ActivityActor = {
	id: string;
	name: string;
	email: string;
};

export type ActivityProject = {
	id: string;
	name: string;
};

type LogActivityInput = {
	workspaceId: string;
	actor: ActivityActor;
	action: string;
	category: ActivityCategory;
	description: string;
	project?: ActivityProject | null;
	projectName?: string | null;
	entityType?: string | null;
	entityId?: string | null;
	headers?: Headers;
};

/**
 * Deletes activity logs older than the retention window for one workspace.
 * Called before writing new entries and when the owner opens the log page,
 * so the table never grows beyond roughly one day of activity.
 */
export async function pruneActivityLogs(workspaceId: string): Promise<void> {
	try {
		await db
			.delete(activityLog)
			.where(
				and(
					eq(activityLog.workspaceId, workspaceId),
					lt(activityLog.createdAt, new Date(Date.now() - ACTIVITY_RETENTION_MS))
				)
			);
	} catch (error) {
		console.error('[activity] Failed to prune old activity logs', error);
	}
}

/**
 * Records an audit entry. Logging must never break the user's action, so all
 * failures are swallowed after being reported to the server log.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
	try {
		await pruneActivityLogs(input.workspaceId);

		const meta = getRequestMeta(input.headers);

		try {
			// Fall back to the socket address when no proxy header is present.
			const clientAddress = getRequestEvent().getClientAddress();
			if (!meta.ipAddress && clientAddress) meta.ipAddress = clientAddress.slice(0, 100);
		} catch {
			// No request event available; keep the header-derived address.
		}

		await db.insert(activityLog).values({
			workspaceId: input.workspaceId,
			userId: input.actor.id,
			actorName: input.actor.name,
			actorEmail: input.actor.email,
			action: input.action,
			category: input.category,
			description: input.description,
			projectId: input.project?.id ?? null,
			projectName: input.project?.name ?? input.projectName ?? null,
			entityType: input.entityType ?? null,
			entityId: input.entityId ?? null,
			ipAddress: meta.ipAddress,
			userAgent: meta.userAgent
		});
	} catch (error) {
		console.error('[activity] Failed to record activity', error);
	}
}
