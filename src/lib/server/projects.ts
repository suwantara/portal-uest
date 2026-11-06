import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import {
	project,
	projectMember,
	task,
	user as userTable,
	workspaceMember,
	type WorkspaceRole
} from './db/schema.ts';
import { canManage } from './workspace.ts';

export async function getAccessibleProjects(
	workspaceId: string,
	userId: string,
	role: WorkspaceRole
) {
	const baseFilter = and(eq(project.workspaceId, workspaceId), eq(project.archived, false));

	if (canManage(role)) {
		return db.query.project.findMany({
			where: baseFilter,
			orderBy: [asc(project.createdAt)]
		});
	}

	const memberProjectIds = db
		.select({ id: projectMember.projectId })
		.from(projectMember)
		.where(eq(projectMember.userId, userId));

	return db.query.project.findMany({
		where: and(baseFilter, inArray(project.id, memberProjectIds)),
		orderBy: [asc(project.createdAt)]
	});
}

export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
	const membership = await db.query.projectMember.findFirst({
		where: and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId))
	});

	return Boolean(membership);
}

export async function getProjectMembers(projectId: string, workspaceId: string) {
	return db
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			role: workspaceMember.role,
			addedAt: projectMember.createdAt
		})
		.from(projectMember)
		.innerJoin(userTable, eq(projectMember.userId, userTable.id))
		.innerJoin(
			workspaceMember,
			and(eq(workspaceMember.userId, userTable.id), eq(workspaceMember.workspaceId, workspaceId))
		)
		.where(eq(projectMember.projectId, projectId))
		.orderBy(asc(userTable.name));
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
	await db.insert(projectMember).values({ projectId, userId }).onConflictDoNothing();
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
	await db.transaction(async (tx) => {
		await tx
			.update(task)
			.set({ assigneeId: null, updatedAt: new Date() })
			.where(and(eq(task.projectId, projectId), eq(task.assigneeId, userId)));

		await tx
			.delete(projectMember)
			.where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)));
	});
}
