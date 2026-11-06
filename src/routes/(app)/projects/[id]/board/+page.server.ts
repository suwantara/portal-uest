import { fail } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { boardColumn, task, user as userTable, workspaceMember } from '#lib/server/db/schema.ts';
import { requireManager, requireProject } from '#lib/server/auth-guard.ts';
import {
	createTaskAction,
	deleteTaskAction,
	moveTaskAction,
	updateTaskAction
} from '#lib/server/task-actions.ts';
import { todayISO } from '#lib/utils.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { project, workspace, membership } = await requireProject(params.id);

	const [columns, tasks, members] = await Promise.all([
		db.query.boardColumn.findMany({
			where: eq(boardColumn.projectId, project.id),
			orderBy: [asc(boardColumn.position), asc(boardColumn.createdAt)]
		}),
		db
			.select({
				id: task.id,
				title: task.title,
				description: task.description,
				priority: task.priority,
				columnId: task.columnId,
				assigneeId: task.assigneeId,
				assigneeName: userTable.name,
				dueDate: task.dueDate,
				position: task.position,
				createdAt: task.createdAt
			})
			.from(task)
			.leftJoin(userTable, eq(task.assigneeId, userTable.id))
			.where(eq(task.projectId, project.id))
			.orderBy(asc(task.position), asc(task.createdAt)),
		db
			.select({
				id: userTable.id,
				name: userTable.name,
				email: userTable.email
			})
			.from(workspaceMember)
			.innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
			.where(eq(workspaceMember.workspaceId, workspace.id))
			.orderBy(asc(userTable.name))
	]);

	return {
		role: membership.role,
		today: todayISO(),
		columns,
		tasks,
		members
	};
};

export const actions = {
	createTask: async ({ request, params }) => {
		const { project, workspace, user } = await requireProject(params.id);
		return createTaskAction(project.id, workspace.id, user.id, await request.formData());
	},

	updateTask: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		return updateTaskAction(project.id, await request.formData());
	},

	deleteTask: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		return deleteTaskAction(project.id, await request.formData());
	},

	moveTask: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		return moveTaskAction(project.id, await request.formData());
	},

	createColumn: async ({ request, params }) => {
		const { project, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const isDone = data.get('isDone') === 'on';

		if (!name) return fail(400, { error: 'Nama kolom wajib diisi.' });
		if (name.length > 60) return fail(400, { error: 'Nama kolom maksimal 60 karakter.' });

		const [{ position }] = await db
			.select({ position: sql<number>`coalesce(max(${boardColumn.position}), -1) + 1` })
			.from(boardColumn)
			.where(eq(boardColumn.projectId, project.id));

		await db.insert(boardColumn).values({
			projectId: project.id,
			name,
			position: Number(position),
			isDone
		});

		return { success: true };
	},

	updateColumn: async ({ request, params }) => {
		const { project, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const data = await request.formData();
		const columnId = String(data.get('columnId') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const isDone = data.get('isDone') === 'on';

		if (!name) return fail(400, { error: 'Nama kolom wajib diisi.' });
		if (name.length > 60) return fail(400, { error: 'Nama kolom maksimal 60 karakter.' });

		const updated = await db
			.update(boardColumn)
			.set({ name, isDone })
			.where(and(eq(boardColumn.id, columnId), eq(boardColumn.projectId, project.id)))
			.returning({ id: boardColumn.id });

		if (!updated.length) return fail(404, { error: 'Kolom tidak ditemukan.' });

		return { success: true };
	},

	deleteColumn: async ({ request, params }) => {
		const { project, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const data = await request.formData();
		const columnId = String(data.get('columnId') ?? '');

		const column = await db.query.boardColumn.findFirst({
			where: and(eq(boardColumn.id, columnId), eq(boardColumn.projectId, project.id))
		});

		if (!column) return fail(404, { error: 'Kolom tidak ditemukan.' });

		const [{ taskCount }] = await db
			.select({ taskCount: sql<number>`count(*)::int` })
			.from(task)
			.where(eq(task.columnId, columnId));

		if (taskCount > 0) {
			return fail(400, {
				error: 'Kolom masih memiliki task. Pindahkan atau hapus task terlebih dahulu.'
			});
		}

		await db.delete(boardColumn).where(eq(boardColumn.id, columnId));

		return { success: true };
	},

	moveColumn: async ({ request, params }) => {
		const { project, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const data = await request.formData();
		const columnId = String(data.get('columnId') ?? '');
		const direction = String(data.get('direction') ?? '');

		if (direction !== 'up' && direction !== 'down') {
			return fail(400, { error: 'Arah perpindahan tidak valid.' });
		}

		const columns = await db.query.boardColumn.findMany({
			where: eq(boardColumn.projectId, project.id),
			orderBy: [asc(boardColumn.position), asc(boardColumn.createdAt)]
		});

		const index = columns.findIndex((column) => column.id === columnId);
		if (index === -1) return fail(404, { error: 'Kolom tidak ditemukan.' });

		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= columns.length) return { success: true };

		const current = columns[index];
		const target = columns[targetIndex];

		await db.transaction(async (tx) => {
			await tx
				.update(boardColumn)
				.set({ position: target.position })
				.where(eq(boardColumn.id, current.id));
			await tx
				.update(boardColumn)
				.set({ position: current.position })
				.where(eq(boardColumn.id, target.id));
		});

		return { success: true };
	}
} satisfies Actions;
