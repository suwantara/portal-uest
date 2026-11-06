import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';

const env: Record<string, string> = {};

for (const [key, value] of Object.entries({
	...process.env,
	...loadEnv('test', process.cwd(), '')
})) {
	if (typeof value === 'string') env[key] = value;
}

env.ORIGIN = 'http://localhost:4173';

export default defineConfig({
	use: { baseURL: 'http://localhost:4173' },
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173',
		port: 4173,
		env,
		reuseExistingServer: !process.env.CI
	},
	testMatch: '**/*.e2e.{ts,js}'
});
