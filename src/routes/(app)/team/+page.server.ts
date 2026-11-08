import { fail } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import { logActivity } from '#lib/server/activity.ts';
import { db } from '#lib/server/db/index.ts';
import {
	boardColumn,
	project,
	task,
	taskAssignee,
	user as userTable,
	workspaceMember
} from '#lib/server/db/schema.ts';
import { requireManager, requireWorkspace } from '#lib/server/auth-guard.ts';
import { isRegistrationEnabled } from '#lib/server/registration.ts';
import { ensureWorkspaceMembership } from '#lib/server/workspace.ts';
import { auth } from '#lib/server/auth.ts';
import {
	createMemberSchema,
	memberIdSchema,
	resetMemberPasswordSchema,
	updateRoleSchema
} from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const ROLE_LABEL: Record<string, string> = {
	owner: 'Owner',
	admin: 'Admin',
	member: 'Member'
};

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
			assigneeId: taskAssignee.userId,
			total: sql<number>`count(*)::int`
		})
		.from(taskAssignee)
		.innerJoin(task, eq(taskAssignee.taskId, task.id))
		.innerJoin(project, eq(task.projectId, project.id))
		.innerJoin(boardColumn, eq(task.columnId, boardColumn.id))
		.where(and(eq(project.workspaceId, workspace.id), eq(boardColumn.isDone, false)))
		.groupBy(taskAssignee.userId);

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
		const { workspace, membership, user } = await requireWorkspace();
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

			await logActivity({
				workspaceId: workspace.id,
				actor: user,
				action: 'member.create',
				category: 'member',
				description: `Membuat akun anggota “${name}” (${email}) dengan role ${ROLE_LABEL[role]}`,
				entityType: 'user',
				entityId: created.id,
				headers: request.headers
			});

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

		const [targetUser] = await db
			.select({ name: userTable.name, email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);

		await db
			.update(workspaceMember)
			.set({ role })
			.where(
				and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspace.id))
			);

		await logActivity({
			workspaceId: workspace.id,
			actor: user,
			action: 'member.role.update',
			category: 'member',
			description: `Mengubah role “${targetUser?.name ?? 'Anggota'}” dari ${ROLE_LABEL[target.role]} menjadi ${ROLE_LABEL[role]}`,
			entityType: 'user',
			entityId: userId,
			headers: request.headers
		});

		return { success: true };
	},

	resetPassword: async ({ request }) => {
		const { workspace, membership, user } = await requireWorkspace();

		if (membership.role !== 'owner') {
			return fail(403, { error: 'Hanya owner yang dapat mereset password anggota.' });
		}

		const parsed = parseFormData(resetMemberPasswordSchema, await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { userId, newPassword } = parsed.data;

		if (userId === user.id) {
			return fail(400, { error: 'Gunakan halaman Akun untuk mengganti password sendiri.' });
		}

		const target = await db.query.workspaceMember.findFirst({
			where: and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspace.id))
		});

		if (!target) return fail(404, { error: 'Anggota tidak ditemukan.' });
		if (target.role === 'owner') {
			return fail(400, { error: 'Password akun owner tidak dapat direset dari sini.' });
		}

		const [targetUser] = await db
			.select({ name: userTable.name, email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);

		try {
			const context = await auth.$context;
			const passwordHash = await context.password.hash(newPassword);
			const account = await context.internalAdapter.findCredentialAccount(userId);

			if (account) {
				await context.internalAdapter.updateAccount(account.id, { password: passwordHash });
			} else {
				await context.internalAdapter.linkAccount({
					userId,
					providerId: 'credential',
					accountId: userId,
					password: passwordHash
				});
			}

			await context.internalAdapter.deleteUserSessions(userId);

			await logActivity({
				workspaceId: workspace.id,
				actor: user,
				action: 'member.password.reset',
				category: 'member',
				description: `Mereset password “${targetUser?.name ?? 'Anggota'}” (${targetUser?.email ?? 'tanpa email'})`,
				entityType: 'user',
				entityId: userId,
				headers: request.headers
			});

			return { success: true, name: targetUser?.name ?? 'Anggota' };
		} catch (error) {
			console.error('[team] Failed to reset member password', error);
			return fail(500, { error: 'Gagal mereset password anggota.' });
		}
	},

	deleteMember: async ({ request }) => {
		const { workspace, membership, user } = await requireWorkspace();

		if (membership.role !== 'owner') {
			return fail(403, { error: 'Hanya owner yang dapat menghapus akun anggota.' });
		}

		const parsed = parseFormData(memberIdSchema, await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { userId } = parsed.data;

		if (userId === user.id) {
			return fail(400, { error: 'Anda tidak dapat menghapus akun sendiri.' });
		}

		const target = await db.query.workspaceMember.findFirst({
			where: and(eq(workspaceMember.userId, userId), eq(workspaceMember.workspaceId, workspace.id))
		});

		if (!target) return fail(404, { error: 'Anggota tidak ditemukan.' });
		if (target.role === 'owner') {
			return fail(400, { error: 'Akun owner tidak dapat dihapus.' });
		}

		const [targetUser] = await db
			.select({ name: userTable.name, email: userTable.email })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);

		try {
			const context = await auth.$context;
			await context.internalAdapter.deleteUser(userId);

			await logActivity({
				workspaceId: workspace.id,
				actor: user,
				action: 'member.delete',
				category: 'member',
				description: `Menghapus akun “${targetUser?.name ?? 'Anggota'}” (${targetUser?.email ?? 'tanpa email'}) dari workspace`,
				entityType: 'user',
				entityId: userId,
				headers: request.headers
			});

			return { success: true, name: targetUser?.name ?? 'Anggota' };
		} catch (error) {
			console.error('[team] Failed to delete member', error);
			return fail(500, { error: 'Gagal menghapus akun anggota.' });
		}
	}
} satisfies Actions;
