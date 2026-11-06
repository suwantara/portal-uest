import { requireProject } from '#lib/server/auth-guard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const { project, membership } = await requireProject(params.id);

	return {
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			color: project.color,
			createdAt: project.createdAt
		},
		role: membership.role
	};
};
