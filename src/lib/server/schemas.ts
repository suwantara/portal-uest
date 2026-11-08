import { z } from 'zod';
import {
	checkboxSchema,
	emailSchema,
	idSchema,
	isIsoDate,
	normalizeUrl,
	parseFormats,
	parseTags,
	passwordSchema
} from './validation.ts';

const nameSchema = z
	.string()
	.trim()
	.min(2, 'Nama minimal 2 karakter.')
	.max(80, 'Nama maksimal 80 karakter.');

const descriptionSchema = (max: number) =>
	z.string().trim().max(max, `Deskripsi maksimal ${max} karakter.`).optional().default('');

const dueDateSchema = z
	.string()
	.trim()
	.max(10, 'Tanggal tenggat tidak valid.')
	.optional()
	.default('')
	.refine((value) => value === '' || isIsoDate(value), 'Tanggal tenggat tidak valid.');

const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
	message: 'Prioritas tidak valid.'
});

const assignableRoleSchema = z.enum(['admin', 'member'], {
	message: 'Role tidak valid.'
});

const urlSchema = z
	.string()
	.trim()
	.min(1, 'URL wajib diisi.')
	.max(2048, 'URL maksimal 2048 karakter.')
	.transform((value, context) => {
		const normalized = normalizeUrl(value);

		if (!normalized) {
			context.addIssue({
				code: 'custom',
				message: 'URL tidak valid. Gunakan alamat http atau https.'
			});
			return z.NEVER;
		}

		return normalized;
	});

const tagsSchema = z
	.string()
	.trim()
	.max(500, 'Tag maksimal 500 karakter.')
	.optional()
	.default('')
	.transform(parseTags);

const linkFields = {
	title: z
		.string()
		.trim()
		.min(1, 'Judul link wajib diisi.')
		.max(160, 'Judul maksimal 160 karakter.'),
	url: urlSchema,
	description: descriptionSchema(500),
	tags: tagsSchema
};

const taskFields = {
	title: z
		.string()
		.trim()
		.min(1, 'Judul task wajib diisi.')
		.max(200, 'Judul task maksimal 200 karakter.'),
	description: descriptionSchema(2000),
	priority: prioritySchema,
	formats: z
		.string()
		.trim()
		.max(500, 'Format maksimal 500 karakter.')
		.optional()
		.default('')
		.transform(parseFormats),
	columnId: idSchema,
	assigneeId: z.string().trim().max(100).optional().default(''),
	dueDate: dueDateSchema
};

export const updateProfileSchema = z.object({ name: nameSchema });

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password wajib diisi.').max(128, 'Password maksimal 128 karakter.'),
	redirectTo: z.string().trim().max(500).optional().default('')
});

export const registerSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Konfirmasi password tidak sama.',
		path: ['confirmPassword']
	});

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Password saat ini wajib diisi.'),
		newPassword: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Konfirmasi password baru tidak sama.',
		path: ['confirmPassword']
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		message: 'Password baru harus berbeda dari password saat ini.',
		path: ['newPassword']
	});

export const createMemberSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	password: passwordSchema,
	role: assignableRoleSchema.default('member')
});

export const updateRoleSchema = z.object({
	userId: idSchema,
	role: assignableRoleSchema
});

export const createTaskSchema = z.object(taskFields);
export const updateTaskSchema = z.object({ taskId: idSchema, ...taskFields });
export const taskIdSchema = z.object({ taskId: idSchema });
export const moveTaskSchema = z.object({ taskId: idSchema, columnId: idSchema });

export const createProjectSchema = z.object({
	name: nameSchema,
	description: descriptionSchema(500),
	color: z
		.string()
		.trim()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Warna tidak valid.')
		.default('#6366f1')
});

export const updateProjectSchema = createProjectSchema;
export const projectIdSchema = z.object({ projectId: idSchema });
export const projectMemberSchema = z.object({ userId: idSchema });
export const memberIdSchema = projectMemberSchema;

export const resetMemberPasswordSchema = z
	.object({
		userId: idSchema,
		newPassword: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Konfirmasi password baru tidak sama.',
		path: ['confirmPassword']
	});

export const createColumnSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Nama kolom wajib diisi.')
		.max(60, 'Nama kolom maksimal 60 karakter.'),
	isDone: checkboxSchema
});

export const updateColumnSchema = z.object({
	columnId: idSchema,
	name: z
		.string()
		.trim()
		.min(1, 'Nama kolom wajib diisi.')
		.max(60, 'Nama kolom maksimal 60 karakter.'),
	isDone: checkboxSchema
});

export const columnIdSchema = z.object({ columnId: idSchema });

export const moveColumnSchema = z.object({
	columnId: idSchema,
	direction: z.enum(['up', 'down'], { message: 'Arah perpindahan tidak valid.' })
});

export const createLinkSchema = z.object(linkFields);
export const updateLinkSchema = z.object({ linkId: idSchema, ...linkFields });
export const linkIdSchema = z.object({ linkId: idSchema });

export const documentIdSchema = z.object({ documentId: idSchema });

export const updateDocumentSchema = z.object({
	documentId: idSchema,
	name: z
		.string()
		.trim()
		.min(1, 'Nama dokumen wajib diisi.')
		.max(180, 'Nama dokumen maksimal 180 karakter.')
});
