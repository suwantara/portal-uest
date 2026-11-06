import { and, asc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	boardColumn,
	document,
	linkNote,
	project,
	task,
	workspaceMember
} from '#lib/server/db/schema.ts';
import { requireWorkspace } from '#lib/server/auth-guard.ts';
import { getAccessibleProjects } from '#lib/server/projects.ts';
import { todayISO } from '#lib/utils.ts';
import type { PageServerLoad } from './$types';

function addDays(iso: string, days: number): string {
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

export const load: PageServerLoad = async () => {
	const { user, workspace, membership } = await requireWorkspace();
	const today = todayISO();
	const inSevenDays = addDays(today, 7);

	const projects = await getAccessibleProjects(workspace.id, user.id, membership.role);
	const projectIds = projects.map((item) => item.id);

	const taskScope = projectIds.length ? inArray(task.projectId, projectIds) : sql`false`;
	const documentScope = projectIds.length ? inArray(document.projectId, projectIds) : sql`false`;
	const linkScope = projectIds.length ? inArray(linkNote.projectId, projectIds) : sql`false`;

	const [
		taskStats,
		projectStats,
		overdueRow,
		memberRow,
		documentRow,
		linkRow,
		myTasks,
		upcomingTasks
	] = await Promise.all([
		db
			.select({
				total: sql<number>`count(*)::int`,
				done: sql<number>`count(*) filter (where ${boardColumn.isDone})::int`
			})
			.from(task)
			.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
			.where(taskScope),
		projectIds.length
			? db
					.select({
						projectId: task.projectId,
						total: sql<number>`count(*)::int`,
						done: sql<number>`count(*) filter (where ${boardColumn.isDone})::int`
					})
					.from(task)
					.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
					.where(inArray(task.projectId, projectIds))
					.groupBy(task.projectId)
			: Promise.resolve([]),
		db
			.select({ value: sql<number>`count(*)::int` })
			.from(task)
			.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
			.where(and(taskScope, eq(boardColumn.isDone, false), lt(task.dueDate, today))),
		db
			.select({ value: sql<number>`count(*)::int` })
			.from(workspaceMember)
			.where(eq(workspaceMember.workspaceId, workspace.id)),
		db
			.select({ value: sql<number>`count(*)::int` })
			.from(document)
			.where(documentScope),
		db
			.select({ value: sql<number>`count(*)::int` })
			.from(linkNote)
			.where(linkScope),
		db
			.select({
				id: task.id,
				title: task.title,
				priority: task.priority,
				dueDate: task.dueDate,
				columnName: boardColumn.name,
				projectId: project.id,
				projectName: project.name,
				projectColor: project.color
			})
			.from(task)
			.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
			.innerJoin(project, eq(task.projectId, project.id))
			.where(and(taskScope, eq(task.assigneeId, user.id), eq(boardColumn.isDone, false)))
			.orderBy(sql`${task.dueDate} asc nulls last`, asc(task.createdAt))
			.limit(6),
		db
			.select({
				id: task.id,
				title: task.title,
				priority: task.priority,
				dueDate: task.dueDate,
				columnName: boardColumn.name,
				projectId: project.id,
				projectName: project.name,
				projectColor: project.color
			})
			.from(task)
			.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
			.innerJoin(project, eq(task.projectId, project.id))
			.where(
				and(
					taskScope,
					eq(boardColumn.isDone, false),
					gte(task.dueDate, today),
					lte(task.dueDate, inSevenDays)
				)
			)
			.orderBy(asc(task.dueDate), asc(task.priority))
			.limit(6)
	]);

	const totalTasks = taskStats[0]?.total ?? 0;
	const doneTasks = taskStats[0]?.done ?? 0;
	const statsByProject = new Map(projectStats.map((row) => [row.projectId, row]));

	return {
		user: { id: user.id, name: user.name },
		today,
		stats: {
			openTasks: totalTasks - doneTasks,
			doneTasks,
			overdueTasks: overdueRow[0]?.value ?? 0,
			members: memberRow[0]?.value ?? 0,
			documents: documentRow[0]?.value ?? 0,
			links: linkRow[0]?.value ?? 0
		},
		projects: projects.map((item) => {
			const counts = statsByProject.get(item.id);
			return {
				id: item.id,
				name: item.name,
				description: item.description,
				color: item.color,
				totalTasks: counts?.total ?? 0,
				doneTasks: counts?.done ?? 0
			};
		}),
		myTasks,
		upcomingTasks
	};
};
