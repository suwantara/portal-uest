export function getRequestMeta(headers?: Headers): {
	ipAddress: string | null;
	userAgent: string | null;
} {
	if (!headers) return { ipAddress: null, userAgent: null };

	const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	const ipAddress =
		headers.get('cf-connecting-ip')?.trim() ||
		headers.get('x-real-ip')?.trim() ||
		forwarded ||
		null;

	return {
		ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
		userAgent: headers.get('user-agent')?.trim().slice(0, 500) || null
	};
}
