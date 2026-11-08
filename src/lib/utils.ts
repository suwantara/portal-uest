export function cn(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(' ');
}

export function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}

export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
	if (!value) return fallback;
	if (!value.startsWith('/') || value.startsWith('//')) return fallback;
	return value;
}

export const APP_TIMEZONE = 'Asia/Makassar';

export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '—';

	const isDateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
	const date =
		typeof value === 'string' ? new Date(isDateOnly ? `${value}T00:00:00Z` : value) : value;

	if (Number.isNaN(date.getTime())) return '—';

	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: isDateOnly ? 'UTC' : APP_TIMEZONE
	}).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return '—';
	const date = typeof value === 'string' ? new Date(value) : value;
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: APP_TIMEZONE
	}).format(date);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
	return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function todayISO(): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: APP_TIMEZONE
	}).formatToParts(new Date());

	const value = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '';

	return `${value('year')}-${value('month')}-${value('day')}`;
}
