import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { boardColumn, document, linkNote, project, task } from '#lib/server/db/schema.ts';
import { requireManager, requireWorkspace } from '#lib/server/auth-guard.ts';
import { DEFAULT_COLUMNS } from '#lib/server/workspace.ts';
import type { Actions, PageServerLoad } from './$types';

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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
		const name = String(data.get('name') ?? '').trim();
		const description = String(data.get('description') ?? '').trim();
		const color = String(data.get('color') ?? '#6366f1');

		if (name.length < 2) return fail(400, { error: 'Nama project minimal 2 karakter.' });
		if (name.length > 80) return fail(400, { error: 'Nama project maksimal 80 karakter.' });
		if (!COLOR_PATTERN.test(color)) return fail(400, { error: 'Warna tidak valid.' });

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
		const projectId = String(data.get('projectId') ?? '');

		const deleted = await db
			.delete(project)
			.where(and(eq(project.id, projectId), eq(project.workspaceId, workspace.id)))
			.returning({ id: project.id });

		if (!deleted.length) return fail(404, { error: 'Project tidak ditemukan.' });

		return { success: true };
	}
} satisfies Actions;
