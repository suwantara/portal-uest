import { fail } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { requireWorkspace } from '#lib/server/auth-guard.ts';
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
	changePassword: async ({ request }) => {
		await requireWorkspace();

		const data = await request.formData();
		const currentPassword = String(data.get('currentPassword') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');
		const revokeOtherSessions = data.get('revokeOtherSessions') === 'on';

		if (!currentPassword) return fail(400, { error: 'Password saat ini wajib diisi.' });
		if (newPassword.length < 8) {
			return fail(400, { error: 'Password baru minimal 8 karakter.' });
		}
		if (newPassword.length > 128) {
			return fail(400, { error: 'Password baru maksimal 128 karakter.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { error: 'Konfirmasi password baru tidak sama.' });
		}
		if (newPassword === currentPassword) {
			return fail(400, { error: 'Password baru harus berbeda dari password saat ini.' });
		}

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

		return { success: true };
	}
} satisfies Actions;
