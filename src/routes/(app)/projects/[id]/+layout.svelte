<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { cn } from '#lib/utils.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let editOpen = $state(false);
	let name = $state('');
	let description = $state('');
	let color = $state('#6366f1');

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

	const tabs = $derived([
		{
			label: 'Board',
			href: resolve('/(app)/projects/[id]/board', { id: data.project.id }),
			icon: 'kanban',
			match: `/projects/${data.project.id}/board`
		},
		{
			label: 'Kalender',
			href: resolve('/(app)/projects/[id]/calendar', { id: data.project.id }),
			icon: 'calendar',
			match: `/projects/${data.project.id}/calendar`
		},
		{
			label: 'Dokumen',
			href: resolve('/(app)/projects/[id]/documents', { id: data.project.id }),
			icon: 'file',
			match: `/projects/${data.project.id}/documents`
		},
		{
			label: 'Link',
			href: resolve('/(app)/projects/[id]/links', { id: data.project.id }),
			icon: 'link',
			match: `/projects/${data.project.id}/links`
		},
		{
			label: 'Anggota',
			href: resolve('/(app)/projects/[id]/members', { id: data.project.id }),
			icon: 'users',
			match: `/projects/${data.project.id}/members`
		}
	]);

	function openEdit() {
		name = data.project.name;
		description = data.project.description ?? '';
		color = data.project.color;
		editOpen = true;
	}
</script>

<div class="space-y-6">
	<header>
		<a
			href={resolve('/(app)/projects')}
			class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-indigo-600"
		>
			<Icon name="chevron-left" size={14} />
			Semua project
		</a>

		<div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex items-start gap-4">
				<span
					class="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
					style={`background-color: ${data.project.color}`}
				>
					<Icon name="kanban" size={22} />
				</span>
				<div>
					<h1 class="text-2xl font-semibold tracking-tight text-slate-900">
						{data.project.name}
					</h1>
					<p class="mt-1 max-w-2xl text-sm text-slate-500">
						{data.project.description || 'Belum ada deskripsi project.'}
					</p>
				</div>
			</div>

			{#if canManage}
				<button
					type="button"
					onclick={openEdit}
					class="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
				>
					<Icon name="edit" size={15} />
					Edit project
				</button>
			{/if}
		</div>

		<nav
			class="no-scrollbar mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class={cn(
						'-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition',
						page.url.pathname === tab.match
							? 'border-indigo-600 text-indigo-600'
							: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
					)}
				>
					<Icon name={tab.icon} size={16} />
					{tab.label}
				</a>
			{/each}
		</nav>
	</header>

	{@render children()}
</div>

<Modal
	bind:open={editOpen}
	title="Edit project"
	description="Perbarui nama, deskripsi, atau warna project."
>
	<form
		method="POST"
		action="?/updateProject"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();

				if (result.type === 'success') {
					editOpen = false;
					toasts.success('Project diperbarui.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string'
							? result.data.error
							: 'Gagal memperbarui project.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		<div>
			<label for="edit-project-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama project
			</label>
			<input
				id="edit-project-name"
				name="name"
				type="text"
				required
				maxlength="80"
				bind:value={name}
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="edit-project-description" class="mb-1.5 block text-sm font-medium text-slate-700">
				Deskripsi <span class="font-normal text-slate-400">(opsional)</span>
			</label>
			<textarea
				id="edit-project-description"
				name="description"
				rows="3"
				maxlength="500"
				bind:value={description}
				class="w-full resize-none rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			></textarea>
		</div>

		<div>
			<span class="mb-2 block text-sm font-medium text-slate-700">Warna</span>
			<div class="flex flex-wrap gap-2.5">
				{#each colors as item (item.value)}
					<label class="cursor-pointer">
						<input
							type="radio"
							name="color"
							value={item.value}
							checked={color === item.value}
							onchange={() => (color = item.value)}
							class="peer sr-only"
						/>
						<span
							class="block size-8 rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500"
							style={`background-color: ${item.value}`}
							title={item.name}
						></span>
					</label>
				{/each}
			</div>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (editOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
			>
				<Icon name="check" size={16} />
				Simpan perubahan
			</button>
		</div>
	</form>
</Modal>
