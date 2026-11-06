import { fail } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { requireWorkspace } from '#lib/server/auth-guard.ts';
import { changePasswordSchema } from '#lib/server/schemas.ts';
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
	changePassword: async ({ request }) => {
		await requireWorkspace();

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

		return { success: true };
	}
} satisfies Actions;
