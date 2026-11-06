import { setTimeout as sleep } from 'node:timers/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;

if (!url) {
	console.error('[migrate] DATABASE_URL is not set');
	process.exit(1);
}

let target;

try {
	target = new URL(url);
} catch {
	console.error('[migrate] DATABASE_URL is not a valid URL');
	process.exit(1);
}

const databaseHost = target.hostname;

console.log(`[migrate] Connecting to ${databaseHost}:${target.port || '5432'}${target.pathname}`);

if (['postgres-service', 'postgres-host', 'host', 'database'].includes(databaseHost)) {
	console.error(
		`[migrate] DATABASE_URL still uses the placeholder host "${databaseHost}". ` +
			'Use the Internal Connection URL from your PostgreSQL service in Dokploy, then redeploy.'
	);
	process.exit(1);
}

function intFromEnv(name, fallback) {
	const raw = process.env[name];
	if (!raw) return fallback;
	const value = Number(raw);
	return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

const retries = intFromEnv('MIGRATION_RETRIES', 10);
const baseDelay = intFromEnv('MIGRATION_RETRY_DELAY_MS', 3000);
const attempts = retries + 1;

function describeError(error) {
	if (!(error instanceof Error)) return String(error);

	let message = error.message;
	const cause = error.cause;

	if (cause instanceof Error && cause.message && !message.includes(cause.message)) {
		message += ` (${cause.message})`;
	}

	return message;
}

const client = postgres(url, { max: 1 });
let applied = false;
let lastError;

for (let attempt = 1; attempt <= attempts; attempt++) {
	try {
		await migrate(drizzle(client), { migrationsFolder: './drizzle' });
		applied = true;
		break;
	} catch (error) {
		lastError = error;

		if (attempt === attempts) break;

		const wait = Math.min(baseDelay * attempt, 10_000);
		console.warn(
			`[migrate] Attempt ${attempt}/${attempts} failed: ${describeError(error)}. Retrying in ${wait}ms...`
		);
		await sleep(wait);
	}
}

if (applied) {
	console.log('[migrate] Database migrations applied');
} else {
	console.error(`[migrate] Migration failed after ${attempts} attempt(s)`, lastError);
	process.exitCode = 1;
}

await client.end();
