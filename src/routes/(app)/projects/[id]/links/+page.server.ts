import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { logActivity } from '#lib/server/activity.ts';
import { db } from '#lib/server/db/index.ts';
import { linkNote, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import { updateProjectAction } from '#lib/server/project-actions.ts';
import { createLinkSchema, linkIdSchema, updateLinkSchema } from '#lib/server/schemas.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { project, membership } = await requireProject(params.id);

	const links = await db
		.select({
			id: linkNote.id,
			url: linkNote.url,
			title: linkNote.title,
			description: linkNote.description,
			tags: linkNote.tags,
			createdAt: linkNote.createdAt,
			creatorName: userTable.name
		})
		.from(linkNote)
		.leftJoin(userTable, eq(linkNote.createdBy, userTable.id))
		.where(eq(linkNote.projectId, project.id))
		.orderBy(desc(linkNote.createdAt));

	return {
		projectId: project.id,
		role: membership.role,
		links
	};
};

export const actions = {
	updateProject: updateProjectAction,

	createLink: async ({ request, params }) => {
		const { project, user } = await requireProject(params.id);
		const data = await request.formData();
		const parsed = parseFormData(createLinkSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { title, url, description, tags } = parsed.data;

		const [created] = await db
			.insert(linkNote)
			.values({
				projectId: project.id,
				title,
				url,
				description: description || null,
				tags,
				createdBy: user.id
			})
			.returning({ id: linkNote.id });

		await logActivity({
			workspaceId: project.workspaceId,
			actor: user,
			action: 'link.create',
			category: 'link',
			description: `Menambahkan link “${title}”`,
			project,
			entityType: 'link',
			entityId: created.id,
			headers: request.headers
		});

		return { success: true };
	},

	updateLink: async ({ request, params }) => {
		const { project, user } = await requireProject(params.id);
		const data = await request.formData();
		const parsed = parseFormData(updateLinkSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { linkId, title, url, description, tags } = parsed.data;

		const updated = await db
			.update(linkNote)
			.set({
				title,
				url,
				description: description || null,
				tags,
				updatedAt: new Date()
			})
			.where(and(eq(linkNote.id, linkId), eq(linkNote.projectId, project.id)))
			.returning({ id: linkNote.id });

		if (!updated.length) return fail(404, { error: 'Link tidak ditemukan.' });

		await logActivity({
			workspaceId: project.workspaceId,
			actor: user,
			action: 'link.update',
			category: 'link',
			description: `Memperbarui link “${title}”`,
			project,
			entityType: 'link',
			entityId: linkId,
			headers: request.headers
		});

		return { success: true };
	},

	deleteLink: async ({ request, params }) => {
		const { project, user } = await requireProject(params.id);
		const data = await request.formData();
		const parsed = parseFormData(linkIdSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const deleted = await db
			.delete(linkNote)
			.where(and(eq(linkNote.id, parsed.data.linkId), eq(linkNote.projectId, project.id)))
			.returning({ id: linkNote.id, title: linkNote.title });

		if (!deleted.length) return fail(404, { error: 'Link tidak ditemukan.' });

		await logActivity({
			workspaceId: project.workspaceId,
			actor: user,
			action: 'link.delete',
			category: 'link',
			description: `Menghapus link “${deleted[0].title}”`,
			project,
			entityType: 'link',
			entityId: deleted[0].id,
			headers: request.headers
		});

		return { success: true };
	}
} satisfies Actions;
