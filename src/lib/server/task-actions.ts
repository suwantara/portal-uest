import { fail } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { logActivity, type ActivityActor } from './activity.ts';
import { db } from './db/index.ts';
import { boardColumn, project, projectMember, task } from './db/schema.ts';
import { createTaskSchema, moveTaskSchema, taskIdSchema, updateTaskSchema } from './schemas.ts';
import { parseFormData } from './validation.ts';

type ProjectRef = { id: string; name: string; workspaceId: string };

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

async function validateAssignee(assigneeId: string, projectId: string): Promise<boolean> {
	if (!assigneeId) return true;
	const member = await db.query.projectMember.findFirst({
		where: and(eq(projectMember.userId, assigneeId), eq(projectMember.projectId, projectId))
	});
	return Boolean(member);
}

async function nextPosition(projectId: string, columnId: string): Promise<number> {
	const [{ position }] = await db
		.select({ position: sql<number>`coalesce(max(${task.position}), -1) + 1` })
		.from(task)
		.where(and(eq(task.projectId, projectId), eq(task.columnId, columnId)));

	return Number(position);
}

export async function createTaskAction(
	project: ProjectRef,
	actor: ActivityActor,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(createTaskSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const { title, description, priority, formats, columnId, assigneeId, dueDate } = parsed.data;

	if (!(await validateProject(project.id, project.workspaceId))) {
		return fail(404, { error: 'Project tidak ditemukan.' });
	}
	if (!(await validateColumn(project.id, columnId))) {
		return fail(400, { error: 'Kolom tidak valid.' });
	}
	if (!(await validateAssignee(assigneeId, project.id))) {
		return fail(400, { error: 'Assignee bukan anggota project.' });
	}

	const [created] = await db
		.insert(task)
		.values({
			projectId: project.id,
			columnId,
			title,
			description: description || null,
			priority,
			formats,
			assigneeId: assigneeId || null,
			dueDate: dueDate || null,
			position: await nextPosition(project.id, columnId),
			createdBy: actor.id
		})
		.returning({ id: task.id });

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'task.create',
		category: 'task',
		description: `Membuat task “${title}”`,
		project,
		entityType: 'task',
		entityId: created.id,
		headers
	});

	return { success: true };
}

export async function updateTaskAction(
	project: ProjectRef,
	actor: ActivityActor,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(updateTaskSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const { taskId, title, description, priority, formats, columnId, assigneeId, dueDate } =
		parsed.data;

	const existing = await db.query.task.findFirst({
		where: and(eq(task.id, taskId), eq(task.projectId, project.id))
	});

	if (!existing) return fail(404, { error: 'Task tidak ditemukan.' });

	if (!(await validateColumn(project.id, columnId))) {
		return fail(400, { error: 'Kolom tidak valid.' });
	}

	if (!(await validateAssignee(assigneeId, project.id))) {
		return fail(400, { error: 'Assignee bukan anggota project.' });
	}

	const position =
		existing.columnId === columnId ? existing.position : await nextPosition(project.id, columnId);

	await db
		.update(task)
		.set({
			title,
			description: description || null,
			priority,
			formats,
			columnId,
			assigneeId: assigneeId || null,
			dueDate: dueDate || null,
			position,
			updatedAt: new Date()
		})
		.where(and(eq(task.id, taskId), eq(task.projectId, project.id)));

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'task.update',
		category: 'task',
		description:
			existing.title === title
				? `Memperbarui task “${title}”`
				: `Mengubah task “${existing.title}” menjadi “${title}”`,
		project,
		entityType: 'task',
		entityId: taskId,
		headers
	});

	return { success: true };
}

export async function deleteTaskAction(
	project: ProjectRef,
	actor: ActivityActor,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(taskIdSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const deleted = await db
		.delete(task)
		.where(and(eq(task.id, parsed.data.taskId), eq(task.projectId, project.id)))
		.returning({ id: task.id, title: task.title });

	if (!deleted.length) return fail(404, { error: 'Task tidak ditemukan.' });

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'task.delete',
		category: 'task',
		description: `Menghapus task “${deleted[0].title}”`,
		project,
		entityType: 'task',
		entityId: deleted[0].id,
		headers
	});

	return { success: true };
}

export async function moveTaskAction(
	project: ProjectRef,
	actor: ActivityActor,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(moveTaskSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const { taskId, columnId } = parsed.data;

	const existing = await db.query.task.findFirst({
		where: and(eq(task.id, taskId), eq(task.projectId, project.id))
	});

	if (!existing) return fail(404, { error: 'Task tidak ditemukan.' });

	const column = await validateColumn(project.id, columnId);
	if (!column) {
		return fail(400, { error: 'Kolom tidak valid.' });
	}
	if (existing.columnId === columnId) return { success: true };

	await db
		.update(task)
		.set({ columnId, position: await nextPosition(project.id, columnId), updatedAt: new Date() })
		.where(and(eq(task.id, taskId), eq(task.projectId, project.id)));

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'task.move',
		category: 'task',
		description: `Memindahkan task “${existing.title}” ke kolom “${column.name}”`,
		project,
		entityType: 'task',
		entityId: taskId,
		headers
	});

	return { success: true };
}
