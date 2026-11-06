import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { isRegistrationEnabled } from '#lib/server/registration.ts';
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
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		const redirectTo = safeRedirect(String(data.get('redirectTo') ?? ''));

		if (!email || !password) {
			return fail(400, { email, error: 'Email dan password wajib diisi.' });
		}

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch {
			return fail(400, {
				email,
				error: 'Email atau password salah. Silakan coba lagi.'
			});
		}

		redirect(303, redirectTo);
	}
} satisfies Actions;
