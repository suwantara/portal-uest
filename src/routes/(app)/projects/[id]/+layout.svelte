<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { cn } from '#lib/utils.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

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
		}
	]);
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
