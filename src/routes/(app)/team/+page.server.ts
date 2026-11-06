import { fail } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	boardColumn,
	project,
	task,
	user as userTable,
	workspaceMember,
	type WorkspaceRole
} from '#lib/server/db/schema.ts';
import { requireManager, requireWorkspace } from '#lib/server/auth-guard.ts';
import { ensureWorkspaceMembership } from '#lib/server/workspace.ts';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const load: PageServerLoad = async ({ url }) => {
	const { workspace, membership } = await requireWorkspace();

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
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		const role = String(data.get('role') ?? 'member') as WorkspaceRole;

		if (name.length < 2) return fail(400, { error: 'Nama minimal 2 karakter.' });
		if (name.length > 80) return fail(400, { error: 'Nama maksimal 80 karakter.' });
		if (!EMAIL_PATTERN.test(email)) return fail(400, { error: 'Format email tidak valid.' });
		if (password.length < 8) return fail(400, { error: 'Password minimal 8 karakter.' });
		if (password.length > 128) return fail(400, { error: 'Password maksimal 128 karakter.' });
		if (!['admin', 'member'].includes(role)) return fail(400, { error: 'Role tidak valid.' });

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
		} catch {
			if (createdId) {
				await context.internalAdapter.deleteUser(createdId).catch(() => {});
			}

			return fail(500, { error: 'Gagal membuat anggota. Coba lagi.' });
		}
	},

	updateRole: async ({ request }) => {
		const { workspace, membership, user } = await requireWorkspace();
		requireManager(membership.role);

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const role = String(data.get('role') ?? '') as WorkspaceRole;

		if (userId === user.id) {
			return fail(400, { error: 'Anda tidak dapat mengubah role sendiri.' });
		}

		if (!['admin', 'member'].includes(role)) {
			return fail(400, { error: 'Role tidak valid.' });
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
