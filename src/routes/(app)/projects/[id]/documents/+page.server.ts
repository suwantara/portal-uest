import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { document, user as userTable } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import { deleteDocumentAction, updateDocumentAction } from '#lib/server/document-actions.ts';
import { updateProjectAction } from '#lib/server/project-actions.ts';
import { getStorageSummary } from '#lib/server/storage.ts';
import {
	deleteUpload,
	isFile,
	isVideoFile,
	MAX_FILES_PER_UPLOAD,
	MAX_FILE_SIZE,
	saveUpload
} from '#lib/server/uploads.ts';
import { formatBytes } from '#lib/utils.ts';
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
			uploadedBy: document.uploadedBy,
			uploaderName: userTable.name
		})
		.from(document)
		.leftJoin(userTable, eq(document.uploadedBy, userTable.id))
		.where(eq(document.projectId, project.id))
		.orderBy(desc(document.createdAt));

	return {
		projectId: project.id,
		role: membership.role,
		currentUserId: membership.userId,
		documents
	};
};

export const actions = {
	updateProject: updateProjectAction,

	uploadDocuments: async ({ request, params }) => {
		const { project, workspace, user } = await requireProject(params.id);
		const data = await request.formData();
		const files = data.getAll('files').filter(isFile);

		if (!files.length) return fail(400, { error: 'Pilih minimal satu file untuk diunggah.' });

		if (files.length > MAX_FILES_PER_UPLOAD) {
			return fail(400, {
				error: `Maksimal ${MAX_FILES_PER_UPLOAD} file dalam satu kali unggah.`
			});
		}

		const video = files.find(isVideoFile);
		if (video) {
			return fail(400, {
				error: `File "${video.name}" adalah video. Upload video tidak diizinkan; hanya dokumen.`
			});
		}

		const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
		if (oversized) {
			return fail(400, {
				error: `File "${oversized.name}" melebihi batas 10 MB.`
			});
		}

		const storage = await getStorageSummary(workspace.id);
		const incomingBytes = files.reduce((total, file) => total + file.size, 0);

		if (storage.used + incomingBytes > storage.limit) {
			return fail(400, {
				error: `Kuota penyimpanan tidak cukup. Sisa ${formatBytes(storage.remaining)} dari ${formatBytes(storage.limit)}.`
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

	updateDocument: async ({ request, params }) => {
		const { project, user, membership } = await requireProject(params.id);
		return updateDocumentAction(project.id, user.id, membership.role, await request.formData());
	},

	deleteDocument: async ({ request, params }) => {
		const { project, user, membership } = await requireProject(params.id);
		return deleteDocumentAction(project.id, user.id, membership.role, await request.formData());
	}
} satisfies Actions;
