import { describe, expect, it } from 'vitest';
import { getRequestMeta } from './request-meta.ts';

describe('request metadata', () => {
	it('prefers Cloudflare client IP over forwarded headers', () => {
		const headers = new Headers({
			'cf-connecting-ip': '203.0.113.10',
			'x-forwarded-for': '198.51.100.7, 10.0.0.1',
			'user-agent': 'Mozilla/5.0'
		});

		expect(getRequestMeta(headers)).toEqual({
			ipAddress: '203.0.113.10',
			userAgent: 'Mozilla/5.0'
		});
	});

	it('uses the first forwarded address when Cloudflare headers are absent', () => {
		const headers = new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' });

		expect(getRequestMeta(headers).ipAddress).toBe('198.51.100.7');
	});

	it('returns null metadata when headers are unavailable', () => {
		expect(getRequestMeta()).toEqual({ ipAddress: null, userAgent: null });
	});
});
