import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { projectMember, user as userTable, workspaceMember } from '#lib/server/db/schema.ts';
import { requireManager, requireProject } from '#lib/server/auth-guard.ts';
import { updateProjectAction } from '#lib/server/project-actions.ts';
import { addProjectMember, getProjectMembers, removeProjectMember } from '#lib/server/projects.ts';
import { projectMemberSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { project, workspace, membership } = await requireProject(params.id);

	const [members, workspaceMembers] = await Promise.all([
		getProjectMembers(project.id, workspace.id),
		db
			.select({
				id: userTable.id,
				name: userTable.name,
				email: userTable.email,
				role: workspaceMember.role
			})
			.from(workspaceMember)
			.innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
			.where(eq(workspaceMember.workspaceId, workspace.id))
			.orderBy(asc(userTable.name))
	]);

	const memberIds = new Set(members.map((member) => member.id));

	return {
		project: { id: project.id, name: project.name, color: project.color },
		role: membership.role,
		members,
		available: workspaceMembers.filter((member) => !memberIds.has(member.id))
	};
};

export const actions = {
	updateProject: updateProjectAction,

	addMember: async ({ request, params }) => {
		const { project, workspace, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const parsed = parseFormData(projectMemberSchema, await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error });

		const target = await db.query.workspaceMember.findFirst({
			where: and(
				eq(workspaceMember.userId, parsed.data.userId),
				eq(workspaceMember.workspaceId, workspace.id)
			)
		});

		if (!target) return fail(404, { error: 'Anggota workspace tidak ditemukan.' });

		await addProjectMember(project.id, parsed.data.userId);

		return { success: true };
	},

	removeMember: async ({ request, params }) => {
		const { project, membership } = await requireProject(params.id);
		requireManager(membership.role);

		const parsed = parseFormData(projectMemberSchema, await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error });

		const target = await db.query.projectMember.findFirst({
			where: and(
				eq(projectMember.projectId, project.id),
				eq(projectMember.userId, parsed.data.userId)
			)
		});

		if (!target) return fail(404, { error: 'Anggota project tidak ditemukan.' });

		await removeProjectMember(project.id, parsed.data.userId);

		return { success: true };
	}
} satisfies Actions;
