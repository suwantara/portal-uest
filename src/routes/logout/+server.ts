import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user) {
		try {
			await auth.api.signOut({ headers: request.headers });
		} catch {
			// The session may already be gone; continue to the login page.
		}
	}

	redirect(303, '/login');
};
