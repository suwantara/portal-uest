import { expect, test } from '@playwright/test';

test('dashboard redirects unauthenticated visitors to login', async ({ page }) => {
	await page.goto('/dashboard');

	await expect(page).toHaveURL(/\/login\?redirectTo=/);
	await expect(page.getByRole('heading', { name: 'Masuk ke workspace' })).toBeVisible();
});

test('login page renders the sign-in form', async ({ page }) => {
	await page.goto('/login');

	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: /Masuk/ })).toBeVisible();
});
