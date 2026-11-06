import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { document } from '#lib/server/db/schema.ts';
import { requireProject } from '#lib/server/auth-guard.ts';
import { readUpload } from '#lib/server/uploads.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { project } = await requireProject(params.id);

	const found = await db.query.document.findFirst({
		where: and(eq(document.id, params.docId), eq(document.projectId, project.id))
	});

	if (!found) error(404, 'Dokumen tidak ditemukan');

	let file: Buffer;
	try {
		file = await readUpload(found.storageKey);
	} catch {
		error(404, 'File tidak ditemukan di storage');
	}

	const preview = url.searchParams.get('preview') === '1' && found.mimeType === 'application/pdf';
	const disposition = preview ? 'inline' : 'attachment';

	return new Response(new Uint8Array(file), {
		headers: {
			'content-type': found.mimeType,
			'content-length': String(file.length),
			'content-disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(found.name)}`,
			'cache-control': 'private, max-age=0, must-revalidate',
			'x-content-type-options': 'nosniff'
		}
	});
};
