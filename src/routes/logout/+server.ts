import { redirect } from '@sveltejs/kit';
import { logActivity } from '#lib/server/activity.ts';
import { auth } from '#lib/server/auth.ts';
import { getWorkspaceContext } from '#lib/server/workspace.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (locals.user) {
		try {
			await auth.api.signOut({ headers: request.headers });

			const context = await getWorkspaceContext(locals.user.id);
			if (context) {
				await logActivity({
					workspaceId: context.workspace.id,
					actor: locals.user,
					action: 'auth.logout',
					category: 'auth',
					description: 'Keluar dari aplikasi',
					headers: request.headers
				});
			}
		} catch (error) {
			// The session may already be gone; continue to the login page.
			console.error('[logout] Failed to record logout activity', error);
		}
	}

	redirect(303, '/login');
};
