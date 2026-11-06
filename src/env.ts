import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	ALLOW_REGISTRATION: {
		description:
			'Allow public self-registration after the first owner exists. The very first user can always register.',
		schema: (value) => value === 'true'
	},
	STORAGE_DRIVER: {
		description: 'Document storage backend: `local` (default) or `r2` for Cloudflare R2.',
		schema: (value) => (value === 'r2' ? 'r2' : 'local')
	},
	UPLOAD_DIR: {
		description:
			'Directory used to store uploaded documents when STORAGE_DRIVER=local (relative to the project root).',
		schema: (value) => value || 'uploads'
	},
	R2_ACCOUNT_ID: {
		description: 'Cloudflare account ID used to derive the R2 S3 endpoint.',
		schema: (value) => value || undefined
	},
	R2_ENDPOINT: {
		description:
			'Optional explicit R2 S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`). Overrides R2_ACCOUNT_ID.',
		schema: (value) => value || undefined
	},
	R2_ACCESS_KEY_ID: {
		description: 'R2 API token access key ID with object read/write permissions.',
		schema: (value) => value || undefined
	},
	R2_SECRET_ACCESS_KEY: {
		description: 'R2 API token secret access key.',
		schema: (value) => value || undefined
	},
	R2_BUCKET: {
		description: 'R2 bucket name used for uploaded documents.',
		schema: (value) => value || undefined
	},
	R2_FORCE_PATH_STYLE: {
		description: 'Use path-style S3 URLs. Set `true` for MinIO or other non-R2 test endpoints.',
		schema: (value) => value === 'true'
	}
});
