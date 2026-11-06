<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Masuk · Portal UEST</title>
</svelte:head>

<AuthShell mode="login">
	{#if data.registrationDisabled}
		<div
			class="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
		>
			<Icon name="alert" size={17} className="mt-0.5 shrink-0" />
			<p>
				Pendaftaran publik ditutup. Minta owner/admin workspace membuatkan akun melalui halaman Tim.
			</p>
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-5">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		{#if form?.error}
			<div
				class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
			>
				<Icon name="alert" size={17} className="mt-0.5 shrink-0" />
				<p>{form.error}</p>
			</div>
		{/if}

		<div>
			<label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				required
				autocomplete="email"
				value={form?.email ?? ''}
				placeholder="nama@perusahaan.com"
				class="w-full rounded-xl border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<PasswordInput id="password" name="password" label="Password" autocomplete="current-password" />

		<button
			type="submit"
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
		>
			Masuk
			<Icon name="arrow-right" size={16} />
		</button>
	</form>

	{#if data.registrationEnabled}
		<p class="mt-6 text-center text-sm text-slate-500">
			Belum punya akun?
			<a
				href={resolve('/register')}
				class="font-semibold text-indigo-600 transition hover:text-indigo-700"
			>
				Daftar sekarang
			</a>
		</p>
	{:else}
		<p class="mt-6 text-center text-sm text-slate-500">
			Belum punya akun? Hubungi owner/admin workspace untuk dibuatkan akun.
		</p>
	{/if}
</AuthShell>
