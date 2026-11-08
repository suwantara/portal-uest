import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { logActivity } from '#lib/server/activity.ts';
import { isRegistrationEnabled } from '#lib/server/registration.ts';
import { loginSchema } from '#lib/server/schemas.ts';
import { formDataToObject, parseFormData } from '#lib/server/validation.ts';
import { getWorkspaceContext } from '#lib/server/workspace.ts';
import { safeRedirect } from '#lib/utils.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		redirect(303, safeRedirect(url.searchParams.get('redirectTo')));
	}

	return {
		redirectTo: safeRedirect(url.searchParams.get('redirectTo')),
		registrationEnabled: await isRegistrationEnabled(),
		registrationDisabled: url.searchParams.get('registration') === 'disabled'
	};
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const parsed = parseFormData(loginSchema, data);

		if (!parsed.success) {
			return fail(400, { email: formDataToObject(data).email ?? '', error: parsed.error });
		}

		const email = parsed.data.email.toLowerCase();
		const password = parsed.data.password;
		const redirectTo = safeRedirect(parsed.data.redirectTo);

		let signedIn: Awaited<ReturnType<typeof auth.api.signInEmail>>;

		try {
			signedIn = await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return fail(400, {
				email,
				error: 'Email atau password salah. Silakan coba lagi.'
			});
		}

		try {
			const context = await getWorkspaceContext(signedIn.user.id);

			if (context) {
				await logActivity({
					workspaceId: context.workspace.id,
					actor: signedIn.user,
					action: 'auth.login',
					category: 'auth',
					description: 'Masuk ke aplikasi',
					headers: request.headers
				});
			}
		} catch (error) {
			console.error('[login] Failed to record login activity', error);
		}

		redirect(303, redirectTo);
	}
} satisfies Actions;
