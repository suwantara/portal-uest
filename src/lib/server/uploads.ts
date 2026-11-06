import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import {
	R2_ACCESS_KEY_ID,
	R2_ACCOUNT_ID,
	R2_BUCKET,
	R2_ENDPOINT,
	R2_FORCE_PATH_STYLE,
	R2_SECRET_ACCESS_KEY,
	STORAGE_DRIVER,
	UPLOAD_DIR
} from '$app/env/private';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;

const root = path.resolve(UPLOAD_DIR);

type R2Config = {
	client: S3Client;
	bucket: string;
};

let r2Config: R2Config | null = null;

function getR2Config(): R2Config {
	if (r2Config) return r2Config;

	const endpoint =
		R2_ENDPOINT ??
		(R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
	const accessKeyId = R2_ACCESS_KEY_ID;
	const secretAccessKey = R2_SECRET_ACCESS_KEY;
	const bucket = R2_BUCKET;

	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error(
			'STORAGE_DRIVER=r2 requires R2_ENDPOINT (or R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET'
		);
	}

	r2Config = {
		bucket,
		client: new S3Client({
			region: 'auto',
			endpoint,
			forcePathStyle: R2_FORCE_PATH_STYLE,
			credentials: { accessKeyId, secretAccessKey },
			// R2 does not support the streaming checksums that newer AWS SDK
			// versions add by default.
			requestChecksumCalculation: 'WHEN_REQUIRED',
			responseChecksumValidation: 'WHEN_REQUIRED'
		})
	};

	return r2Config;
}

function storagePath(key: string): string {
	const resolved = path.resolve(root, key);

	if (resolved !== root && !resolved.startsWith(root + path.sep)) {
		throw new Error('Invalid storage key');
	}

	return resolved;
}

export function isFile(value: FormDataEntryValue | null): value is File {
	return value instanceof File && value.size > 0;
}

export async function saveUpload(projectId: string, file: File) {
	const dot = file.name.lastIndexOf('.');
	const rawExtension = dot > 0 ? file.name.slice(dot + 1) : '';
	const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
	const storageKey = `${projectId}/${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;
	const mimeType = file.type || 'application/octet-stream';
	const bytes = Buffer.from(await file.arrayBuffer());

	if (STORAGE_DRIVER === 'r2') {
		const { client, bucket } = getR2Config();
		await client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: storageKey,
				Body: bytes,
				ContentType: mimeType,
				ContentLength: bytes.length
			})
		);
	} else {
		await mkdir(path.dirname(storagePath(storageKey)), { recursive: true });
		await writeFile(storagePath(storageKey), bytes);
	}

	return {
		storageKey,
		name: file.name.slice(0, 180),
		mimeType,
		size: file.size
	};
}

export async function readUpload(storageKey: string): Promise<Buffer> {
	if (STORAGE_DRIVER === 'r2') {
		const { client, bucket } = getR2Config();
		const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));

		if (!response.Body) throw new Error('File not found in R2');

		return Buffer.from(await response.Body.transformToByteArray());
	}

	return readFile(storagePath(storageKey));
}

export async function deleteUpload(storageKey: string): Promise<void> {
	try {
		if (STORAGE_DRIVER === 'r2') {
			const { client, bucket } = getR2Config();
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
		} else {
			await unlink(storagePath(storageKey));
		}
	} catch {
		// The object may have been removed outside of the app; the DB record is
		// still deleted so nothing breaks.
	}
}
