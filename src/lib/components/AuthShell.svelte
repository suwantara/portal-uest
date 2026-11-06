<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	type Props = {
		mode: 'login' | 'register';
		children: Snippet;
	};

	let { mode, children }: Props = $props();
</script>

<div class="flex min-h-screen bg-slate-50">
	<aside
		class="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex"
	>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.25),transparent_40%)]"
		></div>

		<div class="relative">
			<a href={resolve('/')} class="inline-flex items-center gap-3 text-white">
				<span
					class="flex size-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30"
				>
					<Icon name="layers" size={22} />
				</span>
				<span class="text-lg font-semibold tracking-tight">Portal UEST</span>
			</a>
		</div>

		<div class="relative max-w-md">
			<p class="text-sm font-medium tracking-widest text-indigo-300 uppercase">Team workspace</p>
			<h1 class="mt-4 text-4xl leading-tight font-semibold tracking-tight text-white">
				Satu ruang kerja untuk seluruh tim.
			</h1>
			<p class="mt-4 text-base leading-relaxed text-slate-400">
				Kelola pekerjaan, jadwal, dokumen, dan referensi penting tanpa berpindah-pindah aplikasi.
			</p>

			<ul class="mt-10 space-y-4 text-sm text-slate-300">
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-lg bg-white/5 text-indigo-300"
					>
						<Icon name="kanban" size={16} />
					</span>
					Kanban dan kalender task dalam satu project
				</li>
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-lg bg-white/5 text-indigo-300"
					>
						<Icon name="file" size={16} />
					</span>
					Dokumen tim tersimpan rapi dan aman
				</li>
				<li class="flex items-center gap-3">
					<span
						class="flex size-8 items-center justify-center rounded-lg bg-white/5 text-indigo-300"
					>
						<Icon name="link" size={16} />
					</span>
					Koleksi link dan referensi per project
				</li>
			</ul>
		</div>

		<p class="relative text-xs text-slate-500">Portal UEST · Workspace internal tim</p>
	</aside>

	<main class="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
		<div class="w-full max-w-md">
			<a href={resolve('/')} class="mb-10 inline-flex items-center gap-3 lg:hidden">
				<span class="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
					<Icon name="layers" size={20} />
				</span>
				<span class="text-base font-semibold tracking-tight text-slate-900">Portal UEST</span>
			</a>

			<div
				class="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9"
			>
				<p class="text-sm font-medium text-indigo-600">
					{mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
				</p>
				<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
					{mode === 'login' ? 'Masuk ke workspace' : 'Gabung ke workspace tim'}
				</h2>
				<p class="mt-2 text-sm text-slate-500">
					{mode === 'login'
						? 'Gunakan email dan password akun Portal UEST.'
						: 'Akun pertama otomatis menjadi owner workspace.'}
				</p>

				<div class="mt-7">
					{@render children()}
				</div>
			</div>

			<p class="mt-6 text-center text-xs text-slate-400">Portal UEST · Internal team dashboard</p>
		</div>
	</main>
</div>
