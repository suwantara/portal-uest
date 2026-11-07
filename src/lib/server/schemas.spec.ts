import { describe, expect, it } from 'vitest';
import {
	changePasswordSchema,
	createLinkSchema,
	createMemberSchema,
	createTaskSchema,
	registerSchema
} from './schemas.ts';
import { isIsoDate, parseFormData } from './validation.ts';

const validTask = {
	title: 'Setup dashboard',
	description: 'Cek semua modul',
	priority: 'high',
	columnId: 'column-1',
	assigneeId: '',
	dueDate: '2026-11-10'
};

describe('task schema', () => {
	it('accepts a valid task', () => {
		expect(createTaskSchema.safeParse(validTask).success).toBe(true);
	});

	it('rejects an invalid priority', () => {
		const result = createTaskSchema.safeParse({ ...validTask, priority: 'critical' });

		expect(result.success).toBe(false);
	});

	it('rejects an invalid due date', () => {
		const result = createTaskSchema.safeParse({ ...validTask, dueDate: '2026-02-30' });

		expect(result.success).toBe(false);
	});

	it('parses and deduplicates platforms and formats', () => {
		const result = createTaskSchema.safeParse({
			...validTask,
			formats: 'IG, A4, ig, 1080x1080'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.formats).toEqual(['IG', 'A4', '1080x1080']);
		}
	});

	it('parses FormData through the shared helper', () => {
		const data = new FormData();

		for (const [key, value] of Object.entries(validTask)) data.set(key, value);

		const parsed = parseFormData(createTaskSchema, data);

		expect(parsed.success).toBe(true);
		if (parsed.success) expect(parsed.data.title).toBe('Setup dashboard');
	});
});

describe('registration schema', () => {
	it('rejects an invalid email', () => {
		const result = registerSchema.safeParse({
			name: 'Owner',
			email: 'bukan-email',
			password: 'Password123!',
			confirmPassword: 'Password123!'
		});

		expect(result.success).toBe(false);
	});

	it('rejects mismatched passwords', () => {
		const result = registerSchema.safeParse({
			name: 'Owner',
			email: 'owner@example.com',
			password: 'Password123!',
			confirmPassword: 'Password456!'
		});

		expect(result.success).toBe(false);
	});
});

describe('change password schema', () => {
	it('rejects mismatched new passwords', () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: 'Password123!',
			newPassword: 'Password456!',
			confirmPassword: 'Password789!'
		});

		expect(result.success).toBe(false);
	});

	it('rejects reusing the current password', () => {
		const result = changePasswordSchema.safeParse({
			currentPassword: 'Password123!',
			newPassword: 'Password123!',
			confirmPassword: 'Password123!'
		});

		expect(result.success).toBe(false);
	});
});

describe('member schema', () => {
	it('rejects the owner role', () => {
		const result = createMemberSchema.safeParse({
			name: 'Member',
			email: 'member@example.com',
			password: 'Password123!',
			role: 'owner'
		});

		expect(result.success).toBe(false);
	});
});

describe('link schema', () => {
	it('normalizes the URL and tags', () => {
		const result = createLinkSchema.safeParse({
			title: 'Design system',
			url: 'figma.com/file/abc',
			description: '',
			tags: 'Design, Figma, design'
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.url).toBe('https://figma.com/file/abc');
			expect(result.data.tags).toEqual(['design', 'figma']);
		}
	});

	it('rejects a non-http URL', () => {
		const result = createLinkSchema.safeParse({
			title: 'File lokal',
			url: 'file:///etc/passwd',
			description: '',
			tags: ''
		});

		expect(result.success).toBe(false);
	});
});

describe('date validation', () => {
	it('accepts a valid ISO date', () => {
		expect(isIsoDate('2026-11-10')).toBe(true);
	});

	it('rejects an impossible date', () => {
		expect(isIsoDate('2026-02-30')).toBe(false);
	});
});
