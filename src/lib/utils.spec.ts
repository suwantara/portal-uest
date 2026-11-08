import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, todayISO } from './utils.ts';

describe('date formatting', () => {
	it('keeps date-only values on the same day', () => {
		expect(formatDate('2026-11-08')).toBe('8 Nov 2026');
	});

	it('formats timestamps in Asia/Makassar', () => {
		expect(formatDateTime(new Date('2026-11-08T12:00:00Z'))).toBe('8 Nov 2026, 20.00');
	});

	it('rolls the date correctly across the timezone boundary', () => {
		expect(formatDateTime(new Date('2026-11-08T17:30:00Z'))).toBe('9 Nov 2026, 01.30');
	});

	it('returns today as an ISO date', () => {
		expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
