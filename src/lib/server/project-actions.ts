import { fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { logActivity } from './activity.ts';
import { db } from './db/index.ts';
import { project } from './db/schema.ts';
import { requireManager, requireProject } from './auth-guard.ts';
import { updateProjectSchema } from './schemas.ts';
import { parseFormData } from './validation.ts';

export async function updateProjectAction({ request, params }: RequestEvent) {
	const projectId = params.id;

	if (!projectId) return fail(400, { error: 'Project tidak ditemukan.' });

	const { workspace, membership, user, project: existing } = await requireProject(projectId);
	requireManager(membership.role);

	const parsed = parseFormData(updateProjectSchema, await request.formData());
	if (!parsed.success) return fail(400, { error: parsed.error });

	const { name, description, color } = parsed.data;

	const updated = await db
		.update(project)
		.set({
			name,
			description: description || null,
			color,
			updatedAt: new Date()
		})
		.where(and(eq(project.id, projectId), eq(project.workspaceId, workspace.id)))
		.returning({ id: project.id });

	if (!updated.length) return fail(404, { error: 'Project tidak ditemukan.' });

	await logActivity({
		workspaceId: workspace.id,
		actor: user,
		action: 'project.update',
		category: 'project',
		description:
			existing.name === name
				? `Memperbarui detail project “${name}”`
				: `Mengubah nama project “${existing.name}” menjadi “${name}”`,
		project: { id: projectId, name },
		entityType: 'project',
		entityId: projectId,
		headers: request.headers
	});

	return { success: true };
}
