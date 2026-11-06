import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { boardColumn, document, linkNote, project, task } from '#lib/server/db/schema.ts';
import { requireManager, requireWorkspace } from '#lib/server/auth-guard.ts';
import { createProjectSchema, projectIdSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import { DEFAULT_COLUMNS } from '#lib/server/workspace.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { workspace, membership } = await requireWorkspace();

	const projects = await db.query.project.findMany({
		where: and(eq(project.workspaceId, workspace.id), eq(project.archived, false)),
		orderBy: [asc(project.createdAt)]
	});

	const ids = projects.map((item) => item.id);

	let taskStats: { projectId: string; total: number; done: number }[] = [];
	let documentStats: { projectId: string; total: number }[] = [];
	let linkStats: { projectId: string; total: number }[] = [];

	if (ids.length) {
		[taskStats, documentStats, linkStats] = await Promise.all([
			db
				.select({
					projectId: task.projectId,
					total: sql<number>`count(*)::int`,
					done: sql<number>`count(*) filter (where ${boardColumn.isDone})::int`
				})
				.from(task)
				.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
				.where(inArray(task.projectId, ids))
				.groupBy(task.projectId),
			db
				.select({ projectId: document.projectId, total: sql<number>`count(*)::int` })
				.from(document)
				.where(inArray(document.projectId, ids))
				.groupBy(document.projectId),
			db
				.select({ projectId: linkNote.projectId, total: sql<number>`count(*)::int` })
				.from(linkNote)
				.where(inArray(linkNote.projectId, ids))
				.groupBy(linkNote.projectId)
		]);
	}

	const taskMap = new Map(taskStats.map((row) => [row.projectId, row]));
	const documentMap = new Map(documentStats.map((row) => [row.projectId, row.total]));
	const linkMap = new Map(linkStats.map((row) => [row.projectId, row.total]));

	return {
		role: membership.role,
		projects: projects.map((item) => ({
			id: item.id,
			name: item.name,
			description: item.description,
			color: item.color,
			createdAt: item.createdAt,
			tasks: taskMap.get(item.id)?.total ?? 0,
			doneTasks: taskMap.get(item.id)?.done ?? 0,
			documents: documentMap.get(item.id) ?? 0,
			links: linkMap.get(item.id) ?? 0
		}))
	};
};

export const actions = {
	createProject: async ({ request }) => {
		const { workspace, membership, user } = await requireWorkspace();
		requireManager(membership.role);

		const data = await request.formData();
		const parsed = parseFormData(createProjectSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { name, description, color } = parsed.data;

		const [created] = await db
			.insert(project)
			.values({
				workspaceId: workspace.id,
				name,
				description: description || null,
				color,
				createdBy: user.id
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

		return { success: true, projectId: created.id };
	},

	deleteProject: async ({ request }) => {
		const { workspace, membership } = await requireWorkspace();
		requireManager(membership.role);

		const data = await request.formData();
		const parsed = parseFormData(projectIdSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const deleted = await db
			.delete(project)
			.where(and(eq(project.id, parsed.data.projectId), eq(project.workspaceId, workspace.id)))
			.returning({ id: project.id });

		if (!deleted.length) return fail(404, { error: 'Project tidak ditemukan.' });

		return { success: true };
	}
} satisfies Actions;
