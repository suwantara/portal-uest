import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const PROTECTED_PREFIXES = ['/dashboard', '/projects', '/team', '/settings'];

function isProtected(pathname: string): boolean {
	return PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	if (!session && isProtected(event.url.pathname)) {
		const redirectTo = event.url.pathname + event.url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
