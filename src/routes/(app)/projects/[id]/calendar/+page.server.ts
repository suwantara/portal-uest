import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { boardColumn, task, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import { updateProjectAction } from '#lib/server/project-actions.ts';
import { getProjectMembers } from '#lib/server/projects.ts';
import { createTaskAction, deleteTaskAction, updateTaskAction } from '#lib/server/task-actions.ts';
import { todayISO } from '#lib/utils.ts';
import type { Actions, PageServerLoad } from './$types';

function currentMonth(): string {
	return todayISO().slice(0, 7);
}

function nextMonth(month: string): string {
	const [year, monthNumber] = month.split('-').map(Number);
	const date = new Date(Date.UTC(year, monthNumber, 1));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function validMonth(value: string | null): string {
	if (!value || !/^\d{4}-\d{2}$/.test(value)) return currentMonth();
	const monthNumber = Number(value.slice(5, 7));
	if (monthNumber < 1 || monthNumber > 12) return currentMonth();
	return value;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const { project, workspace, membership } = await requireProject(params.id);
	const month = validMonth(url.searchParams.get('month'));
	const from = `${month}-01`;
	const to = `${nextMonth(month)}-01`;

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
				formats: task.formats,
				columnId: task.columnId,
				columnName: boardColumn.name,
				isDone: boardColumn.isDone,
				assigneeId: task.assigneeId,
				assigneeName: userTable.name,
				dueDate: task.dueDate
			})
			.from(task)
			.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
			.leftJoin(userTable, eq(task.assigneeId, userTable.id))
			.where(and(eq(task.projectId, project.id), gte(task.dueDate, from), lt(task.dueDate, to)))
			.orderBy(asc(task.dueDate), asc(task.position)),
		getProjectMembers(project.id, workspace.id)
	]);

	return {
		projectId: project.id,
		role: membership.role,
		month,
		today: todayISO(),
		columns,
		tasks,
		members
	};
};

export const actions = {
	updateProject: updateProjectAction,

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
	}
} satisfies Actions;
