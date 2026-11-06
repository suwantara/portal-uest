import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { document, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import { updateProjectAction } from '#lib/server/project-actions.ts';
import { documentIdSchema } from '#lib/server/schemas.ts';
import {
	deleteUpload,
	isFile,
	MAX_FILES_PER_UPLOAD,
	MAX_FILE_SIZE,
	saveUpload
} from '#lib/server/uploads.ts';
import { parseFormData } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { project, membership } = await requireProject(params.id);

	const documents = await db
		.select({
			id: document.id,
			name: document.name,
			mimeType: document.mimeType,
			size: document.size,
			createdAt: document.createdAt,
			uploaderName: userTable.name
		})
		.from(document)
		.leftJoin(userTable, eq(document.uploadedBy, userTable.id))
		.where(eq(document.projectId, project.id))
		.orderBy(desc(document.createdAt));

	return {
		projectId: project.id,
		role: membership.role,
		documents
	};
};

export const actions = {
	updateProject: updateProjectAction,

	uploadDocuments: async ({ request, params }) => {
		const { project, user } = await requireProject(params.id);
		const data = await request.formData();
		const files = data.getAll('files').filter(isFile);

		if (!files.length) return fail(400, { error: 'Pilih minimal satu file untuk diunggah.' });

		if (files.length > MAX_FILES_PER_UPLOAD) {
			return fail(400, {
				error: `Maksimal ${MAX_FILES_PER_UPLOAD} file dalam satu kali unggah.`
			});
		}

		const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
		if (oversized) {
			return fail(400, {
				error: `File "${oversized.name}" melebihi batas 10 MB.`
			});
		}

		const savedKeys: string[] = [];

		try {
			for (const file of files) {
				const uploaded = await saveUpload(project.id, file);
				savedKeys.push(uploaded.storageKey);
				await db.insert(document).values({
					projectId: project.id,
					name: uploaded.name,
					mimeType: uploaded.mimeType,
					size: uploaded.size,
					storageKey: uploaded.storageKey,
					uploadedBy: user.id
				});
			}
		} catch (error) {
			console.error('[documents] Failed to upload files', error);
			await Promise.all(savedKeys.map((key) => deleteUpload(key)));
			return fail(500, { error: 'Gagal menyimpan file. Silakan coba lagi.' });
		}

		return { success: true, uploaded: files.length };
	},

	deleteDocument: async ({ request, params }) => {
		const { project } = await requireProject(params.id);
		const data = await request.formData();
		const parsed = parseFormData(documentIdSchema, data);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const found = await db.query.document.findFirst({
			where: and(eq(document.id, parsed.data.documentId), eq(document.projectId, project.id))
		});

		if (!found) return fail(404, { error: 'Dokumen tidak ditemukan.' });

		await db.delete(document).where(eq(document.id, found.id));
		await deleteUpload(found.storageKey);

		return { success: true };
	}
} satisfies Actions;
