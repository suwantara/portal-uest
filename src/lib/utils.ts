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

export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '—';
	const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
	if (Number.isNaN(date.getTime())) return '—';
	return new Intl.DateTimeFormat('id-ID', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
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
		minute: '2-digit'
	}).format(date);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function todayISO(): string {
	const now = new Date();
	const offset = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
