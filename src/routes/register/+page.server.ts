import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/dashboard');
};

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const email = String(data.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		if (name.length < 2) {
			return fail(400, { name, email, error: 'Nama minimal 2 karakter.' });
		}

		if (!email) {
			return fail(400, { name, email, error: 'Email wajib diisi.' });
		}

		if (password.length < 8) {
			return fail(400, { name, email, error: 'Password minimal 8 karakter.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { name, email, error: 'Konfirmasi password tidak sama.' });
		}

		try {
			await auth.api.signUpEmail({
				body: { name, email, password }
			});
		} catch (error) {
			const message =
				error instanceof Error && /exist/i.test(error.message)
					? 'Email sudah terdaftar. Silakan masuk.'
					: 'Pendaftaran gagal. Periksa kembali data Anda.';

			return fail(400, { name, email, error: message });
		}

		redirect(303, '/dashboard');
	}
} satisfies Actions;
