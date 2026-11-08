import { z } from 'zod';

export type ParseFormResult<T> = { success: true; data: T } | { success: false; error: string };

export function formDataToObject(data: FormData): Record<string, string> {
	const values: Record<string, string> = {};

	for (const [key, value] of data) {
		if (typeof value === 'string') values[key] = value;
	}

	return values;
}

export function parseFormData<Schema extends z.ZodType>(
	schema: Schema,
	data: FormData
): ParseFormResult<z.infer<Schema>> {
	const result = schema.safeParse(formDataToObject(data));

	if (!result.success) {
		return {
			success: false,
			error: result.error.issues[0]?.message ?? 'Input tidak valid.'
		};
	}

	return { success: true, data: result.data };
}

export function isIsoDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

	const date = new Date(`${value}T00:00:00Z`);

	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const isHttp = /^https?:\/\//i.test(trimmed);
	const hasOtherScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
	const isUnsupportedScheme = /^(javascript|data|mailto|tel|file|blob):/i.test(trimmed);

	if ((hasOtherScheme && !isHttp) || isUnsupportedScheme) return null;

	const candidate = isHttp ? trimmed : `https://${trimmed}`;

	try {
		const parsed = new URL(candidate);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
}

export function parseFormats(value: string): string[] {
	const seen = new Set<string>();

	return value
		.split(',')
		.map((format) => format.trim().slice(0, 30))
		.filter((format) => {
			if (!format) return false;

			const key = format.toLowerCase();
			if (seen.has(key)) return false;

			seen.add(key);
			return true;
		})
		.slice(0, 10);
}

export function parseIdList(value: string, max = 20): string[] {
	const seen = new Set<string>();

	return value
		.split(',')
		.map((id) => id.trim())
		.filter((id) => {
			if (!id || seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.slice(0, max);
}

export function parseTags(value: string): string[] {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim().toLowerCase())
				.filter(Boolean)
		)
	].slice(0, 8);
}

export const idSchema = z.string().trim().min(1, 'ID tidak valid.').max(100, 'ID tidak valid.');

export const emailSchema = z
	.string()
	.trim()
	.max(254, 'Email maksimal 254 karakter.')
	.email('Format email tidak valid.');

export const passwordSchema = z
	.string()
	.min(8, 'Password minimal 8 karakter.')
	.max(128, 'Password maksimal 128 karakter.');

export const checkboxSchema = z.preprocess((value) => value === 'on', z.boolean());
