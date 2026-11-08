import { fail, redirect } from '@sveltejs/kit';
import { logActivity } from '#lib/server/activity.ts';
import { auth } from '#lib/server/auth.ts';
import { isRegistrationEnabled } from '#lib/server/registration.ts';
import { registerSchema } from '#lib/server/schemas.ts';
import { formDataToObject, parseFormData } from '#lib/server/validation.ts';
import { ensureWorkspaceMembership, getWorkspaceContext } from '#lib/server/workspace.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/dashboard');
	if (!(await isRegistrationEnabled())) redirect(303, '/login?registration=disabled');
};

export const actions = {
	default: async ({ request }) => {
		if (!(await isRegistrationEnabled())) {
			return fail(403, {
				name: '',
				email: '',
				error: 'Pendaftaran ditutup. Minta owner/admin workspace untuk membuatkan akun.'
			});
		}

		const data = await request.formData();
		const parsed = parseFormData(registerSchema, data);

		if (!parsed.success) {
			const values = formDataToObject(data);
			return fail(400, {
				name: values.name ?? '',
				email: values.email ?? '',
				error: parsed.error
			});
		}

		const name = parsed.data.name;
		const email = parsed.data.email.toLowerCase();
		const password = parsed.data.password;

		let signedUp: Awaited<ReturnType<typeof auth.api.signUpEmail>>;

		try {
			signedUp = await auth.api.signUpEmail({
				body: { name, email, password }
			});
		} catch (error) {
			const message =
				error instanceof Error && /exist/i.test(error.message)
					? 'Email sudah terdaftar. Silakan masuk.'
					: 'Pendaftaran gagal. Periksa kembali data Anda.';

			return fail(400, { name, email, error: message });
		}

		try {
			const context =
				(await getWorkspaceContext(signedUp.user.id)) ??
				(await ensureWorkspaceMembership(signedUp.user.id));

			await logActivity({
				workspaceId: context.workspace.id,
				actor: signedUp.user,
				action: 'auth.register',
				category: 'auth',
				description: 'Mendaftar dan bergabung dengan workspace',
				headers: request.headers
			});
		} catch (error) {
			console.error('[register] Failed to record registration activity', error);
		}

		redirect(303, '/dashboard');
	}
} satisfies Actions;
