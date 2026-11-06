import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import {
	boardColumn,
	project,
	projectMember,
	workspace,
	workspaceMember,
	type WorkspaceRole
} from './db/schema';

export const WORKSPACE_SLUG = 'portal-uest';
export const WORKSPACE_NAME = 'Portal UEST';

export const DEFAULT_COLUMNS: { name: string; isDone: boolean }[] = [
	{ name: 'Todo', isDone: false },
	{ name: 'In Progress', isDone: false },
	{ name: 'Review', isDone: false },
	{ name: 'Done', isDone: true }
];

export const ROLE_RANK: Record<WorkspaceRole, number> = {
	member: 1,
	admin: 2,
	owner: 3
};

export type WorkspaceContext = {
	workspace: typeof workspace.$inferSelect;
	membership: typeof workspaceMember.$inferSelect;
};

export function canManage(role: WorkspaceRole): boolean {
	return ROLE_RANK[role] >= ROLE_RANK.admin;
}

export async function getWorkspaceContext(userId: string): Promise<WorkspaceContext | null> {
	const membership = await db.query.workspaceMember.findFirst({
		where: eq(workspaceMember.userId, userId),
		with: { workspace: true }
	});

	if (!membership) return null;

	return { workspace: membership.workspace, membership };
}

/**
 * Makes sure a signed-in user belongs to the single team workspace.
 * The first user becomes owner; everybody else joins as a regular member.
 * Also bootstraps a default project with a standard kanban board.
 */
export async function ensureWorkspaceMembership(userId: string): Promise<WorkspaceContext> {
	const existing = await getWorkspaceContext(userId);
	if (existing) return existing;

	await db
		.insert(workspace)
		.values({ name: WORKSPACE_NAME, slug: WORKSPACE_SLUG })
		.onConflictDoNothing();

	const team = await db.query.workspace.findFirst({
		where: eq(workspace.slug, WORKSPACE_SLUG)
	});

	if (!team) throw new Error('Could not create the team workspace');

	const [{ memberCount }] = await db
		.select({ memberCount: sql<number>`count(*)::int` })
		.from(workspaceMember)
		.where(eq(workspaceMember.workspaceId, team.id));

	const role: WorkspaceRole = memberCount === 0 ? 'owner' : 'member';

	await db
		.insert(workspaceMember)
		.values({ workspaceId: team.id, userId, role })
		.onConflictDoNothing();

	const existingProject = await db.query.project.findFirst({
		where: eq(project.workspaceId, team.id)
	});

	if (!existingProject) {
		const [created] = await db
			.insert(project)
			.values({
				workspaceId: team.id,
				name: 'General',
				description: 'Ruang kerja utama untuk tim.',
				color: '#6366f1',
				createdBy: userId
			})
			.returning();

		await db.insert(boardColumn).values(
			DEFAULT_COLUMNS.map((column, index) => ({
				projectId: created.id,
				name: column.name,
				position: index,
				isDone: column.isDone
			}))
		);

		await db.insert(projectMember).values({ projectId: created.id, userId });
	}

	const context = await getWorkspaceContext(userId);
	if (!context) throw new Error('Could not create workspace membership');

	return context;
}
