import { and, asc, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import { ACTIVITY_RETENTION_HOURS, pruneActivityLogs } from '#lib/server/activity.ts';
import { requireOwner, requireWorkspace } from '#lib/server/auth-guard.ts';
import { db } from '#lib/server/db/index.ts';
import { activityLog, type ActivityCategory } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 40;

const CATEGORIES: ActivityCategory[] = [
	'auth',
	'project',
	'task',
	'document',
	'link',
	'member',
	'account'
];

const RANGES = {
	'1h': { label: '1 jam terakhir', hours: 1 },
	'6h': { label: '6 jam terakhir', hours: 6 },
	'24h': { label: '24 jam terakhir', hours: 24 }
} as const;

type RangeKey = keyof typeof RANGES;

function parsePage(value: string | null): number {
	const page = Number(value ?? '1');
	return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

export const load: PageServerLoad = async ({ url }) => {
	const { workspace, membership } = await requireWorkspace();
	requireOwner(membership.role);

	// Enforce retention before reading so the owner always sees at most 24 hours.
	await pruneActivityLogs(workspace.id);

	const rawCategory = url.searchParams.get('category');
	const category = CATEGORIES.includes(rawCategory as ActivityCategory)
		? (rawCategory as ActivityCategory)
		: null;

	const rawRange = url.searchParams.get('range');
	const range: RangeKey = rawRange && rawRange in RANGES ? (rawRange as RangeKey) : '24h';
	const cutoff = new Date(Date.now() - RANGES[range].hours * 60 * 60 * 1000);

	const actorEmail = (url.searchParams.get('actor') ?? '').trim().slice(0, 254);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);

	const filters = [eq(activityLog.workspaceId, workspace.id), gte(activityLog.createdAt, cutoff)];

	if (category) filters.push(eq(activityLog.category, category));
	if (actorEmail) filters.push(eq(activityLog.actorEmail, actorEmail));
	if (q) {
		const pattern = `%${q}%`;
		const search = or(
			ilike(activityLog.description, pattern),
			ilike(activityLog.actorName, pattern),
			ilike(activityLog.actorEmail, pattern),
			ilike(activityLog.projectName, pattern)
		);

		if (search) filters.push(search);
	}

	const where = and(...filters);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(activityLog)
		.where(where);

	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(parsePage(url.searchParams.get('page')), pageCount);

	const [activities, actors, statsRows] = await Promise.all([
		db
			.select({
				id: activityLog.id,
				actorName: activityLog.actorName,
				actorEmail: activityLog.actorEmail,
				action: activityLog.action,
				category: activityLog.category,
				description: activityLog.description,
				projectName: activityLog.projectName,
				ipAddress: activityLog.ipAddress,
				userAgent: activityLog.userAgent,
				createdAt: activityLog.createdAt
			})
			.from(activityLog)
			.where(where)
			.orderBy(desc(activityLog.createdAt))
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db
			.select({
				email: activityLog.actorEmail,
				name: sql<string>`(array_agg(${activityLog.actorName} order by ${activityLog.createdAt} desc))[1]`
			})
			.from(activityLog)
			.where(eq(activityLog.workspaceId, workspace.id))
			.groupBy(activityLog.actorEmail)
			.orderBy(asc(activityLog.actorEmail)),
		db
			.select({
				activities: sql<number>`count(*)::int`,
				logins: sql<number>`count(*) filter (where ${activityLog.action} = 'auth.login')::int`,
				activeUsers: sql<number>`count(distinct ${activityLog.userId})::int`
			})
			.from(activityLog)
			.where(eq(activityLog.workspaceId, workspace.id))
	]);

	const stats = statsRows[0] ?? { activities: 0, logins: 0, activeUsers: 0 };

	return {
		role: membership.role,
		retentionHours: ACTIVITY_RETENTION_HOURS,
		stats,
		activities: activities.map((activity) => ({
			...activity,
			createdAt: activity.createdAt.toISOString()
		})),
		actors,
		categories: CATEGORIES,
		ranges: Object.entries(RANGES).map(([value, item]) => ({ value, label: item.label })),
		filters: {
			category: category ?? '',
			actor: actorEmail,
			range,
			q
		},
		pagination: {
			page,
			pageCount,
			total,
			pageSize: PAGE_SIZE
		}
	};
};
