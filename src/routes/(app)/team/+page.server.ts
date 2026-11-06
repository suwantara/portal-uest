import { fail } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	boardColumn,
	project,
	task,
	user as userTable,
	workspaceMember
} from '#lib/server/db/schema.ts';
import { requireManager, requireWorkspace } from '#lib/server/auth-guard.ts';
import { isRegistrationEnabled } from '#lib/server/registration.ts';
import { ensureWorkspaceMembership } from '#lib/server/workspace.ts';
import { auth } from '#lib/server/auth.ts';
import { createMemberSchema, updateRoleSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const { workspace, membership } = await requireWorkspace();
	requireManager(membership.role);

	const members = await db
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
		.orderBy(asc(workspaceMember.createdAt));

	const workload = await db
		.select({
			assigneeId: task.assigneeId,
			total: sql<number>`count(*)::int`
		})
		.from(task)
		.innerJoin(project, eq(task.projectId, project.id))
		.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
		.where(and(eq(project.workspaceId, workspace.id), eq(boardColumn.isDone, false)))
		.groupBy(task.assigneeId);

	const workloadMap = new Map(workload.map((row) => [row.assigneeId, row.total]));

	return {
		workspace: { name: workspace.name },
		role: membership.role,
		currentUserId: membership.userId,
		registerUrl: `${url.origin}/register`,
		registrationEnabled: await isRegistrationEnabled(),
		members: members.map((member) => ({
			...member,
			openTasks: workloadMap.get(member.id) ?? 0
		}))
	};
};

export const actions = {
	createMember: async ({ request }) => {
		const { workspace, membership } = await requireWorkspace();
		requireManager(membership.role);

		const data = await request.formData();
		const parsed = parseFormData(createMemberSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { name, password, role } = parsed.data;
		const email = parsed.data.email.toLowerCase();

		const context = await auth.$context;
		const existing = await context.internalAdapter.findUserByEmail(email);

		if (existing) return fail(400, { error: 'Email sudah terdaftar.' });

		let createdId: string | null = null;

		try {
			const hash = await context.password.hash(password);
			const created = await context.internalAdapter.createUser(
				{ name, email, emailVerified: false },
				{ method: 'email-password' }
			);

			if (!created) return fail(500, { error: 'Gagal membuat akun anggota.' });
			createdId = created.id;

			await context.internalAdapter.linkAccount({
				userId: created.id,
				providerId: 'credential',
				accountId: created.id,
				password: hash
			});

			await ensureWorkspaceMembership(created.id);

			if (role === 'admin') {
				await db
					.update(workspaceMember)
					.set({ role })
					.where(
						and(
							eq(workspaceMember.workspaceId, workspace.id),
							eq(workspaceMember.userId, created.id)
						)
					);
			}

			return { success: true, name };
		} catch (error) {
			console.error('[team] Failed to create member', error);

			if (createdId) {
				await context.internalAdapter.deleteUser(createdId).catch((cleanupError) => {
					console.error('[team] Failed to clean up member after error', cleanupError);
				});
			}

			return fail(500, { error: 'Gagal membuat anggota. Coba lagi.' });
		}
	},

	updateRole: async ({ request }) => {
		const { workspace, membership, user } = await requireWorkspace();
		requireManager(membership.role);

		const data = await request.formData();
		const parsed = parseFormData(updateRoleSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { userId, role } = parsed.data;

		if (userId === user.id) {
			return fail(400, { error: 'Anda tidak dapat mengubah role sendiri.' });
		}

		const target = await db.query.workspaceMember.findFirst({
			where: and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspace.id))
		});

		if (!target) return fail(404, { error: 'Anggota tidak ditemukan.' });
		if (target.role === 'owner') {
			return fail(400, { error: 'Role owner tidak dapat diubah.' });
		}

		await db
			.update(workspaceMember)
			.set({ role })
			.where(
				and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspace.id))
			);

		return { success: true };
	}
} satisfies Actions;
