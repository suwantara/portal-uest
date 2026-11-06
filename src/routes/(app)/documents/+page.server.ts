import { fail } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { document, project, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject, requireWorkspace } from '#lib/server/auth-guard.ts';
import { deleteDocumentAction, updateDocumentAction } from '#lib/server/document-actions.ts';
import { getAccessibleProjects } from '#lib/server/projects.ts';
import { projectIdSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { user, workspace, membership } = await requireWorkspace();
	const projects = await getAccessibleProjects(workspace.id, user.id, membership.role);
	const projectIds = projects.map((item) => item.id);

	const documents = projectIds.length
		? await db
				.select({
					id: document.id,
					name: document.name,
					mimeType: document.mimeType,
					size: document.size,
					createdAt: document.createdAt,
					uploadedBy: document.uploadedBy,
					uploaderName: userTable.name,
					projectId: project.id,
					projectName: project.name,
					projectColor: project.color
				})
				.from(document)
				.innerJoin(project, eq(document.projectId, project.id))
				.leftJoin(userTable, eq(document.uploadedBy, userTable.id))
				.where(inArray(document.projectId, projectIds))
				.orderBy(desc(document.createdAt))
		: [];

	return {
		role: membership.role,
		currentUserId: user.id,
		projectCount: projects.length,
		documents
	};
};

export const actions = {
	updateDocument: async ({ request }) => {
		const data = await request.formData();
		const parsed = parseFormData(projectIdSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { project, user, membership } = await requireProject(parsed.data.projectId);

		return updateDocumentAction(project.id, user.id, membership.role, data);
	},

	deleteDocument: async ({ request }) => {
		const data = await request.formData();
		const parsed = parseFormData(projectIdSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { project, user, membership } = await requireProject(parsed.data.projectId);

		return deleteDocumentAction(project.id, user.id, membership.role, data);
	}
} satisfies Actions;
