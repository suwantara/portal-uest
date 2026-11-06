<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let createOpen = $state(false);
	let selectedColor = $state('#6366f1');

	const colors = [
		{ name: 'Indigo', value: '#6366f1' },
		{ name: 'Emerald', value: '#10b981' },
		{ name: 'Amber', value: '#f59e0b' },
		{ name: 'Rose', value: '#f43f5e' },
		{ name: 'Sky', value: '#0ea5e9' },
		{ name: 'Violet', value: '#8b5cf6' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Orange', value: '#f97316' }
	];

	const canManage = $derived(data.role === 'owner' || data.role === 'admin');
</script>

<svelte:head>
	<title>Projects · Portal UEST</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
			<p class="mt-1 text-sm text-slate-500">
				{data.projects.length} project aktif di workspace ini.
			</p>
		</div>

		{#if canManage}
			<button
				type="button"
				onclick={() => (createOpen = true)}
				class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
			>
				<Icon name="plus" size={17} />
				Project baru
			</button>
		{/if}
	</header>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.projects as project (project.id)}
			{@const progress = project.tasks ? Math.round((project.doneTasks / project.tasks) * 100) : 0}
			<article
				class="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
			>
				<div class="flex items-start justify-between">
					<span
						class="flex size-10 items-center justify-center rounded-xl text-white"
						style={`background-color: ${project.color}`}
					>
						<Icon name="kanban" size={18} />
					</span>

					<div class="flex items-center gap-1">
						{#if canManage}
							<form
								method="POST"
								action="?/deleteProject"
								onsubmit={(event) => {
									if (
										!confirm(
											`Hapus project "${project.name}" beserta seluruh task, dokumen, dan link?`
										)
									) {
										event.preventDefault();
									}
								}}
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (result.type === 'success') toasts.success('Project dihapus.');
										if (result.type === 'failure') toasts.error('Gagal menghapus project.');
									};
								}}
							>
								<input type="hidden" name="projectId" value={project.id} />
								<button
									type="submit"
									class="rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
									aria-label={`Hapus ${project.name}`}
								>
									<Icon name="trash" size={15} />
								</button>
							</form>
						{/if}
						<a
							href={resolve('/(app)/projects/[id]/board', { id: project.id })}
							class="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-indigo-600"
							aria-label={`Buka ${project.name}`}
						>
							<Icon name="arrow-right" size={17} />
						</a>
					</div>
				</div>

				<a href={resolve('/(app)/projects/[id]/board', { id: project.id })} class="mt-4 block">
					<h2 class="text-sm font-semibold text-slate-900">{project.name}</h2>
					<p class="mt-1 line-clamp-2 min-h-8 text-xs text-slate-400">
						{project.description || 'Belum ada deskripsi.'}
					</p>
				</a>

				<div class="mt-4 flex items-center gap-4 text-xs text-slate-400">
					<span class="inline-flex items-center gap-1.5">
						<Icon name="kanban" size={14} />
						{project.tasks} task
					</span>
					<span class="inline-flex items-center gap-1.5">
						<Icon name="file" size={14} />
						{project.documents}
					</span>
					<span class="inline-flex items-center gap-1.5">
						<Icon name="link" size={14} />
						{project.links}
					</span>
				</div>

				<div class="mt-4 flex items-center justify-between text-[11px] text-slate-400">
					<span>{project.doneTasks}/{project.tasks} selesai</span>
					<span class="font-medium text-slate-600">{progress}%</span>
				</div>
				<div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
					<div
						class="h-full rounded-full transition-all"
						style={`width: ${progress}%; background-color: ${project.color}`}
					></div>
				</div>
			</article>
		{:else}
			<div
				class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center"
			>
				<span
					class="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"
				>
					<Icon name="folder-plus" size={26} />
				</span>
				<h2 class="mt-4 text-base font-semibold text-slate-800">
					{canManage ? 'Belum ada project' : 'Belum tergabung di project'}
				</h2>
				<p class="mt-1 max-w-sm text-sm text-slate-400">
					{canManage
						? 'Project adalah tempat task, kalender, dokumen, dan link tim dikelompokkan.'
						: 'Hubungi owner/admin workspace agar Anda ditambahkan ke project yang sesuai.'}
				</p>
				{#if canManage}
					<button
						type="button"
						onclick={() => (createOpen = true)}
						class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
					>
						<Icon name="plus" size={16} />
						Buat project pertama
					</button>
				{/if}
			</div>
		{/each}
	</div>
</div>

<Modal
	bind:open={createOpen}
	title="Project baru"
	description="Buat ruang kerja untuk satu inisiatif atau tim."
>
	<form
		method="POST"
		action="?/createProject"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success') {
					createOpen = false;
					toasts.success('Project berhasil dibuat.');
					selectedColor = '#6366f1';
				}
				if (result.type === 'failure') {
					toasts.error(typeof form?.error === 'string' ? form.error : 'Gagal membuat project.');
				}
			};
		}}
		class="space-y-5"
	>
		{#if form?.error && createOpen}
			<div class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{form.error}
			</div>
		{/if}

		<div>
			<label for="project-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama project
			</label>
			<input
				id="project-name"
				name="name"
				type="text"
				required
				maxlength="80"
				placeholder="Contoh: Portal Akademik"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="project-description" class="mb-1.5 block text-sm font-medium text-slate-700">
				Deskripsi <span class="font-normal text-slate-400">(opsional)</span>
			</label>
			<textarea
				id="project-description"
				name="description"
				rows="3"
				maxlength="500"
				placeholder="Apa tujuan project ini?"
				class="w-full resize-none rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			></textarea>
		</div>

		<div>
			<span class="mb-2 block text-sm font-medium text-slate-700">Warna</span>
			<div class="flex flex-wrap gap-2.5">
				{#each colors as color (color.value)}
					<label class="cursor-pointer">
						<input
							type="radio"
							name="color"
							value={color.value}
							checked={selectedColor === color.value}
							onchange={() => (selectedColor = color.value)}
							class="peer sr-only"
						/>
						<span
							class="block size-8 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500"
							style={`background-color: ${color.value}`}
							title={color.name}
						></span>
					</label>
				{/each}
			</div>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (createOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
			>
				<Icon name="plus" size={16} />
				Buat project
			</button>
		</div>
	</form>
</Modal>
