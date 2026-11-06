import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { project, user as userTable, workspaceMember } from '#lib/server/db/schema.ts';
import { requireWorkspace } from '#lib/server/auth-guard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const { user, workspace, membership } = await requireWorkspace();

	const [projects, members] = await Promise.all([
		db.query.project.findMany({
			where: and(eq(project.workspaceId, workspace.id), eq(project.archived, false)),
			orderBy: [asc(project.createdAt)]
		}),
		db
			.select({
				id: userTable.id,
				name: userTable.name,
				email: userTable.email,
				role: workspaceMember.role,
				joinedAt: workspaceMember.createdAt
			})
			.from(workspaceMember)
			.innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
			.where(eq(workspaceMember.workspaceId, workspace.id))
			.orderBy(asc(workspaceMember.createdAt))
	]);

	return {
		user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
		workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
		role: membership.role,
		projects: projects.map((item) => ({
			id: item.id,
			name: item.name,
			color: item.color
		})),
		members
	};
};
