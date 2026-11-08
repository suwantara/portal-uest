import { fail } from '@sveltejs/kit';
import { logActivity } from '#lib/server/activity.ts';
import { auth } from '#lib/server/auth.ts';
import { requireWorkspace } from '#lib/server/auth-guard.ts';
import { changePasswordSchema, updateProfileSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function isWrongPassword(error: unknown): boolean {
	const record = error as {
		body?: { code?: string; message?: string };
		message?: string;
	} | null;

	const code = record?.body?.code ?? '';
	const text = `${record?.body?.message ?? ''} ${record?.message ?? ''}`.toLowerCase();

	return (
		code === 'INVALID_PASSWORD' ||
		text.includes('invalid password') ||
		text.includes('incorrect password')
	);
}

export const load: PageServerLoad = async () => {
	const { user, workspace, membership } = await requireWorkspace();

	return {
		user: { name: user.name, email: user.email },
		workspace: { name: workspace.name },
		role: membership.role
	};
};

export const actions = {
	updateProfile: async ({ request }) => {
		const { user, workspace } = await requireWorkspace();

		const parsed = parseFormData(updateProfileSchema, await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error });

		try {
			await auth.api.updateUser({
				body: { name: parsed.data.name },
				headers: request.headers
			});
		} catch (error) {
			console.error('[settings] Failed to update profile', error);
			return fail(500, { error: 'Gagal memperbarui nama akun.' });
		}

		if (parsed.data.name !== user.name) {
			await logActivity({
				workspaceId: workspace.id,
				actor: { ...user, name: parsed.data.name },
				action: 'account.profile.update',
				category: 'account',
				description: `Mengubah nama akun dari “${user.name}” menjadi “${parsed.data.name}”`,
				headers: request.headers
			});
		}

		return { success: true, name: parsed.data.name };
	},

	changePassword: async ({ request }) => {
		const { user, workspace } = await requireWorkspace();

		const data = await request.formData();
		const parsed = parseFormData(changePasswordSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { currentPassword, newPassword } = parsed.data;
		const revokeOtherSessions = data.get('revokeOtherSessions') === 'on';

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions },
				headers: request.headers
			});
		} catch (error) {
			return fail(400, {
				error: isWrongPassword(error)
					? 'Password saat ini salah.'
					: 'Gagal mengubah password. Silakan coba lagi.'
			});
		}

		await logActivity({
			workspaceId: workspace.id,
			actor: user,
			action: 'account.password.change',
			category: 'account',
			description: 'Mengubah password akun',
			headers: request.headers
		});

		return { success: true };
	}
} satisfies Actions;
