import { requireWorkspace } from '#lib/server/auth-guard.ts';
import { getAccessibleProjects } from '#lib/server/projects.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const { user, workspace, membership } = await requireWorkspace();
	const projects = await getAccessibleProjects(workspace.id, user.id, membership.role);

	return {
		user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
		workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
		role: membership.role,
		projects: projects.map((item) => ({
			id: item.id,
			name: item.name,
			color: item.color
		}))
	};
};
