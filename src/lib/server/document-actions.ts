import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { logActivity, type ActivityActor } from './activity.ts';
import { db } from './db/index.ts';
import { document, type WorkspaceRole } from './db/schema.ts';
import { documentIdSchema, updateDocumentSchema } from './schemas.ts';
import { deleteUpload } from './uploads.ts';
import { parseFormData } from './validation.ts';
import { canManage } from './workspace.ts';

type ProjectRef = { id: string; name: string; workspaceId: string };

async function findDocument(projectId: string, documentId: string) {
	return db.query.document.findFirst({
		where: and(eq(document.id, documentId), eq(document.projectId, projectId))
	});
}

function canModify(role: WorkspaceRole, userId: string, uploadedBy: string | null): boolean {
	return uploadedBy === userId || canManage(role);
}

export async function updateDocumentAction(
	project: ProjectRef,
	actor: ActivityActor,
	role: WorkspaceRole,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(updateDocumentSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const found = await findDocument(project.id, parsed.data.documentId);
	if (!found) return fail(404, { error: 'Dokumen tidak ditemukan.' });

	if (!canModify(role, actor.id, found.uploadedBy)) {
		return fail(403, { error: 'Hanya pengunggah dokumen yang dapat mengubahnya.' });
	}

	await db.update(document).set({ name: parsed.data.name }).where(eq(document.id, found.id));

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'document.update',
		category: 'document',
		description:
			found.name === parsed.data.name
				? `Memperbarui detail dokumen “${parsed.data.name}”`
				: `Mengubah nama dokumen “${found.name}” menjadi “${parsed.data.name}”`,
		project,
		entityType: 'document',
		entityId: found.id,
		headers
	});

	return { success: true };
}

export async function deleteDocumentAction(
	project: ProjectRef,
	actor: ActivityActor,
	role: WorkspaceRole,
	data: FormData,
	headers: Headers
) {
	const parsed = parseFormData(documentIdSchema, data);
	if (!parsed.success) return fail(400, { error: parsed.error });

	const found = await findDocument(project.id, parsed.data.documentId);
	if (!found) return fail(404, { error: 'Dokumen tidak ditemukan.' });

	if (!canModify(role, actor.id, found.uploadedBy)) {
		return fail(403, { error: 'Hanya pengunggah dokumen yang dapat menghapusnya.' });
	}

	await db.delete(document).where(eq(document.id, found.id));
	await deleteUpload(found.storageKey);

	await logActivity({
		workspaceId: project.workspaceId,
		actor,
		action: 'document.delete',
		category: 'document',
		description: `Menghapus dokumen “${found.name}”`,
		project,
		entityType: 'document',
		entityId: found.id,
		headers
	});

	return { success: true };
}
