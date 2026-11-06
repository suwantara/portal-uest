import { fail } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { boardColumn, project, task, workspaceMember, type TaskPriority } from './db/schema';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

function value(data: FormData, key: string): string {
	return String(data.get(key) ?? '').trim();
}

function parseDueDate(data: FormData): string | null | undefined {
	const raw = value(data, 'dueDate');
	if (!raw) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
	const date = new Date(`${raw}T00:00:00Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return undefined;
	return raw;
}

async function validateProject(projectId: string, workspaceId: string) {
	const found = await db.query.project.findFirst({
		where: and(eq(project.id, projectId), eq(project.workspaceId, workspaceId))
	});
	return found ?? null;
}

async function validateColumn(projectId: string, columnId: string) {
	return db.query.boardColumn.findFirst({
		where: and(eq(boardColumn.id, columnId), eq(boardColumn.projectId, projectId))
	});
}

async function validateAssignee(assigneeId: string, workspaceId: string): Promise<boolean> {
	if (!assigneeId) return true;
	const member = await db.query.workspaceMember.findFirst({
		where: and(eq(workspaceMember.userId, assigneeId), eq(workspaceMember.workspaceId, workspaceId))
	});
	return Boolean(member);
}

export async function createTaskAction(
	projectId: string,
	workspaceId: string,
	userId: string,
	data: FormData
) {
	const title = value(data, 'title');
	const description = value(data, 'description');
	const priority = value(data, 'priority') as TaskPriority;
	const columnId = value(data, 'columnId');
	const assigneeId = value(data, 'assigneeId');
	const dueDate = parseDueDate(data);

	if (!title) return fail(400, { error: 'Judul task wajib diisi.' });
	if (title.length > 200) return fail(400, { error: 'Judul task maksimal 200 karakter.' });
	if (!PRIORITIES.includes(priority)) return fail(400, { error: 'Prioritas tidak valid.' });
	if (dueDate === undefined) return fail(400, { error: 'Tanggal tenggat tidak valid.' });
	if (!(await validateProject(projectId, workspaceId))) {
		return fail(404, { error: 'Project tidak ditemukan.' });
	}
	if (!(await validateColumn(projectId, columnId))) {
		return fail(400, { error: 'Kolom tidak valid.' });
	}
	if (!(await validateAssignee(assigneeId, workspaceId))) {
		return fail(400, { error: 'Assignee bukan anggota tim.' });
	}

	const [{ position }] = await db
		.select({ position: sql<number>`coalesce(max(${task.position}), -1) + 1` })
		.from(task)
		.where(and(eq(task.projectId, projectId), eq(task.columnId, columnId)));

	await db.insert(task).values({
		projectId,
		columnId,
		title,
		description: description || null,
		priority,
		assigneeId: assigneeId || null,
		dueDate,
		position: Number(position),
		createdBy: userId
	});

	return { success: true };
}

export async function updateTaskAction(projectId: string, data: FormData) {
	const taskId = value(data, 'taskId');
	const title = value(data, 'title');
	const description = value(data, 'description');
	const priority = value(data, 'priority') as TaskPriority;
	const columnId = value(data, 'columnId');
	const assigneeId = value(data, 'assigneeId');
	const dueDate = parseDueDate(data);

	if (!taskId) return fail(400, { error: 'Task tidak ditemukan.' });
	if (!title) return fail(400, { error: 'Judul task wajib diisi.' });
	if (title.length > 200) return fail(400, { error: 'Judul task maksimal 200 karakter.' });
	if (!PRIORITIES.includes(priority)) return fail(400, { error: 'Prioritas tidak valid.' });
	if (dueDate === undefined) return fail(400, { error: 'Tanggal tenggat tidak valid.' });

	const existing = await db.query.task.findFirst({
		where: and(eq(task.id, taskId), eq(task.projectId, projectId))
	});

	if (!existing) return fail(404, { error: 'Task tidak ditemukan.' });

	const column = await validateColumn(projectId, columnId);
	if (!column) return fail(400, { error: 'Kolom tidak valid.' });

	const projectRow = await db.query.project.findFirst({
		where: eq(project.id, projectId)
	});

	if (!projectRow || !(await validateAssignee(assigneeId, projectRow.workspaceId))) {
		return fail(400, { error: 'Assignee bukan anggota tim.' });
	}

	let position = existing.position;
	if (existing.columnId !== columnId) {
		const [{ next }] = await db
			.select({ next: sql<number>`coalesce(max(${task.position}), -1) + 1` })
			.from(task)
			.where(and(eq(task.projectId, projectId), eq(task.columnId, columnId)));
		position = Number(next);
	}

	await db
		.update(task)
		.set({
			title,
			description: description || null,
			priority,
			columnId,
			assigneeId: assigneeId || null,
			dueDate,
			position,
			updatedAt: new Date()
		})
		.where(and(eq(task.id, taskId), eq(task.projectId, projectId)));

	return { success: true };
}

export async function deleteTaskAction(projectId: string, data: FormData) {
	const taskId = value(data, 'taskId');
	if (!taskId) return fail(400, { error: 'Task tidak ditemukan.' });

	const deleted = await db
		.delete(task)
		.where(and(eq(task.id, taskId), eq(task.projectId, projectId)))
		.returning({ id: task.id });

	if (!deleted.length) return fail(404, { error: 'Task tidak ditemukan.' });

	return { success: true };
}

export async function moveTaskAction(projectId: string, data: FormData) {
	const taskId = value(data, 'taskId');
	const columnId = value(data, 'columnId');

	if (!taskId || !columnId) return fail(400, { error: 'Data perpindahan tidak lengkap.' });

	const existing = await db.query.task.findFirst({
		where: and(eq(task.id, taskId), eq(task.projectId, projectId))
	});

	if (!existing) return fail(404, { error: 'Task tidak ditemukan.' });
	if (!(await validateColumn(projectId, columnId))) {
		return fail(400, { error: 'Kolom tidak valid.' });
	}
	if (existing.columnId === columnId) return { success: true };

	const [{ next }] = await db
		.select({ next: sql<number>`coalesce(max(${task.position}), -1) + 1` })
		.from(task)
		.where(and(eq(task.projectId, projectId), eq(task.columnId, columnId)));

	await db
		.update(task)
		.set({ columnId, position: Number(next), updatedAt: new Date() })
		.where(and(eq(task.id, taskId), eq(task.projectId, projectId)));

	return { success: true };
}
