import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { document, type WorkspaceRole } from './db/schema.ts';
import { documentIdSchema, updateDocumentSchema } from './schemas.ts';
import { deleteUpload } from './uploads.ts';
import { parseFormData } from './validation.ts';
import { canManage } from './workspace.ts';

async function findDocument(projectId: string, documentId: string) {
	return db.query.document.findFirst({
		where: and(eq(document.id, documentId), eq(document.projectId, projectId))
	});
}

function canModify(role: WorkspaceRole, userId: string, uploadedBy: string | null): boolean {
	return uploadedBy === userId || canManage(role);
}

export async function updateDocumentAction(
	projectId: string,
	userId: string,
	role: WorkspaceRole,
	data: FormData
) {
	const parsed = parseFormData(updateDocumentSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const found = await findDocument(projectId, parsed.data.documentId);
	if (!found) return fail(404, { error: 'Dokumen tidak ditemukan.' });

	if (!canModify(role, userId, found.uploadedBy)) {
		return fail(403, { error: 'Hanya pengunggah dokumen yang dapat mengubahnya.' });
	}

	await db.update(document).set({ name: parsed.data.name }).where(eq(document.id, found.id));

	return { success: true };
}

export async function deleteDocumentAction(
	projectId: string,
	userId: string,
	role: WorkspaceRole,
	data: FormData
) {
	const parsed = parseFormData(documentIdSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const found = await findDocument(projectId, parsed.data.documentId);
	if (!found) return fail(404, { error: 'Dokumen tidak ditemukan.' });

	if (!canModify(role, userId, found.uploadedBy)) {
		return fail(403, { error: 'Hanya pengunggah dokumen yang dapat menghapusnya.' });
	}

	await db.delete(document).where(eq(document.id, found.id));
	await deleteUpload(found.storageKey);

	return { success: true };
}
