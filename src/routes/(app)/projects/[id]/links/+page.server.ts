import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { linkNote, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import type { Actions, PageServerLoad } from './$types';

function normalizeUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		const parsed = new URL(candidate);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
}

function parseTags(value: string): string[] {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim().toLowerCase())
				.filter(Boolean)
		)
	].slice(0, 8);
}

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
	createLink: async ({ request, params }) => {
		const { project, user } = await requireProject(params.id);
		const data = await request.formData();
		const title = String(data.get('title') ?? '').trim();
		const url = normalizeUrl(String(data.get('url') ?? ''));
		const description = String(data.get('description') ?? '').trim();
		const tags = parseTags(String(data.get('tags') ?? ''));

		if (!title) return fail(400, { error: 'Judul link wajib diisi.' });
		if (title.length > 160) return fail(400, { error: 'Judul maksimal 160 karakter.' });
		if (!url) return fail(400, { error: 'URL tidak valid. Gunakan alamat http atau https.' });

		await db.insert(linkNote).values({
			projectId: project.id,
			title,
			url,
			description: description || null,
			tags,
			createdBy: user.id
		});

		return { success: true };
	},

	updateLink: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		const data = await request.formData();
		const linkId = String(data.get('linkId') ?? '');
		const title = String(data.get('title') ?? '').trim();
		const url = normalizeUrl(String(data.get('url') ?? ''));
		const description = String(data.get('description') ?? '').trim();
		const tags = parseTags(String(data.get('tags') ?? ''));

		if (!title) return fail(400, { error: 'Judul link wajib diisi.' });
		if (!url) return fail(400, { error: 'URL tidak valid. Gunakan alamat http atau https.' });

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

		return { success: true };
	},

	deleteLink: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		const data = await request.formData();
		const linkId = String(data.get('linkId') ?? '');

		const deleted = await db
			.delete(linkNote)
			.where(and(eq(linkNote.id, linkId), eq(linkNote.projectId, project.id)))
			.returning({ id: linkNote.id });

		if (!deleted.length) return fail(404, { error: 'Link tidak ditemukan.' });

		return { success: true };
	}
} satisfies Actions;
