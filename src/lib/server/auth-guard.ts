import { error, redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import type { User } from 'better-auth';
import { db } from './db';
import { project } from './db/schema';
import type { WorkspaceRole } from './db/schema';
import {
	canManage,
	ensureWorkspaceMembership,
	getWorkspaceContext,
	type WorkspaceContext
} from './workspace';

export function requireUser(): User {
	const { locals, url } = getRequestEvent();

	if (!locals.user) {
		const redirectTo = url.pathname + url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return locals.user;
}

export async function requireWorkspace() {
	const user = requireUser();
	const context: WorkspaceContext =
		(await getWorkspaceContext(user.id)) ?? (await ensureWorkspaceMembership(user.id));

	return { user, ...context };
}

export async function requireProject(projectId: string) {
	const context = await requireWorkspace();

	const found = await db.query.project.findFirst({
		where: and(eq(project.id, projectId), eq(project.workspaceId, context.workspace.id))
	});

	if (!found) error(404, 'Project tidak ditemukan');

	return { ...context, project: found };
}

export function requireManager(role: WorkspaceRole): void {
	if (!canManage(role)) error(403, 'Hanya owner atau admin yang dapat melakukan aksi ini');
}
