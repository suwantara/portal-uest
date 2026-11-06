<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>Daftar · Portal UEST</title>
</svelte:head>

<AuthShell mode="register">
	<form method="POST" use:enhance class="space-y-5">
		{#if form?.error}
			<div
				class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
			>
				<Icon name="alert" size={17} className="mt-0.5 shrink-0" />
				<p>{form.error}</p>
			</div>
		{/if}

		<div>
			<label for="name" class="mb-1.5 block text-sm font-medium text-slate-700">Nama lengkap</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				autocomplete="name"
				value={form?.name ?? ''}
				placeholder="Nama Anda"
				class="w-full rounded-xl border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

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

		<div class="grid gap-4 sm:grid-cols-2">
			<PasswordInput
				id="password"
				name="password"
				label="Password"
				placeholder="Min. 8 karakter"
				autocomplete="new-password"
				minlength={8}
			/>
			<PasswordInput
				id="confirmPassword"
				name="confirmPassword"
				label="Ulangi password"
				placeholder="Ulangi password"
				autocomplete="new-password"
				minlength={8}
			/>
		</div>

		<button
			type="submit"
			class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
		>
			Buat akun
			<Icon name="arrow-right" size={16} />
		</button>
	</form>

	<p class="mt-6 text-center text-sm text-slate-500">
		Sudah punya akun?
		<a
			href={resolve('/login')}
			class="font-semibold text-indigo-600 transition hover:text-indigo-700"
		>
			Masuk di sini
		</a>
	</p>
</AuthShell>
