import { asc, eq, inArray } from 'drizzle-orm';
import { db } from './db/index.ts';
import { taskAssignee, user } from './db/schema.ts';

export type TaskAssignee = {
	id: string;
	name: string;
};

/**
 * Loads assignees for a batch of tasks, grouped by task id. Tasks with no
 * assignees simply don't get a map entry.
 */
export async function getAssigneesByTask(taskIds: string[]): Promise<Map<string, TaskAssignee[]>> {
	const map = new Map<string, TaskAssignee[]>();
	if (!taskIds.length) return map;

	const rows = await db
		.select({
			taskId: taskAssignee.taskId,
			id: user.id,
			name: user.name
		})
		.from(taskAssignee)
		.innerJoin(user, eq(taskAssignee.userId, user.id))
		.where(inArray(taskAssignee.taskId, taskIds))
		.orderBy(asc(user.name));

	for (const row of rows) {
		const list = map.get(row.taskId) ?? [];
		list.push({ id: row.id, name: row.name });
		map.set(row.taskId, list);
	}

	return map;
}
