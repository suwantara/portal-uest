<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { cn, formatBytes } from '#lib/utils.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let mobileOpen = $state(false);

	afterNavigate(() => {
		mobileOpen = false;
	});

	const canManage = $derived(data.role === 'owner' || data.role === 'admin');

	const navItems = $derived([
		{
			label: 'Dashboard',
			href: resolve('/(app)/dashboard'),
			icon: 'dashboard',
			match: '/dashboard'
		},
		{ label: 'Projects', href: resolve('/(app)/projects'), icon: 'folder', match: '/projects' },
		{ label: 'Dokumen', href: resolve('/(app)/documents'), icon: 'file', match: '/documents' },
		...(canManage
			? [{ label: 'Tim', href: resolve('/(app)/team'), icon: 'users', match: '/team' }]
			: [])
	]);

	const roleLabel: Record<string, string> = {
		owner: 'Owner',
		admin: 'Admin',
		member: 'Member'
	};

	const storageTone = $derived(
		data.storage.percent >= 90
			? 'bg-rose-400'
			: data.storage.percent >= 75
				? 'bg-amber-400'
				: 'bg-indigo-400'
	);

	function isActive(match: string): boolean {
		return page.url.pathname === match || page.url.pathname.startsWith(`${match}/`);
	}
</script>

<svelte:head>
	<title>Portal UEST</title>
</svelte:head>

<div class="min-h-screen">
	<header
		class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden"
	>
		<button
			type="button"
			onclick={() => (mobileOpen = true)}
			class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
			aria-label="Buka menu"
		>
			<Icon name="menu" size={20} />
		</button>
		<div class="flex items-center gap-2.5">
			<span class="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
				<Icon name="layers" size={17} />
			</span>
			<span class="text-sm font-semibold text-slate-900">Portal UEST</span>
		</div>
	</header>

	{#if mobileOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
			onclick={() => (mobileOpen = false)}
			aria-label="Tutup menu"
		></button>
	{/if}

	<aside
		class={cn(
			'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 transition-transform duration-200 lg:translate-x-0',
			mobileOpen ? 'translate-x-0' : '-translate-x-full'
		)}
	>
		<div class="flex h-16 items-center justify-between border-b border-white/10 px-5">
			<a href={resolve('/(app)/dashboard')} class="flex items-center gap-3 text-white">
				<span class="flex size-9 items-center justify-center rounded-xl bg-indigo-500">
					<Icon name="layers" size={19} />
				</span>
				<span class="text-sm font-semibold tracking-tight">Portal UEST</span>
			</a>
			<button
				type="button"
				class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
				onclick={() => (mobileOpen = false)}
				aria-label="Tutup menu"
			>
				<Icon name="x" size={18} />
			</button>
		</div>

		<div class="flex-1 overflow-y-auto px-3 py-5">
			<nav class="space-y-1">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class={cn(
							'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
							isActive(item.match)
								? 'bg-white/10 text-white'
								: 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
						)}
					>
						<Icon name={item.icon} size={18} />
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="mt-8">
				<div class="flex items-center justify-between px-3">
					<span class="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
						Projects
					</span>
					<a
						href={resolve('/(app)/projects')}
						class="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
						aria-label="Lihat semua project"
					>
						<Icon name="plus" size={14} />
					</a>
				</div>

				<div class="mt-2 space-y-0.5">
					{#each data.projects as project (project.id)}
						<a
							href={resolve('/(app)/projects/[id]/board', { id: project.id })}
							class={cn(
								'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
								page.url.pathname.startsWith(`/projects/${project.id}`)
									? 'bg-white/10 text-white'
									: 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
							)}
						>
							<span
								class="size-2 shrink-0 rounded-full"
								style={`background-color: ${project.color}`}
							></span>
							<span class="truncate">{project.name}</span>
						</a>
					{:else}
						<p class="px-3 py-2 text-xs text-slate-500">Belum ada project.</p>
					{/each}
				</div>
			</div>
		</div>

		<div class="border-t border-white/10 p-3">
			<div class="rounded-xl bg-white/5 p-3">
				<div class="flex items-center justify-between text-[11px]">
					<span class="font-medium text-slate-300">Penyimpanan</span>
					<span class="text-slate-500">{Math.round(data.storage.percent)}%</span>
				</div>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
					<div
						class={`h-full rounded-full transition-all ${storageTone}`}
						style={`width: ${Math.min(100, data.storage.percent)}%`}
					></div>
				</div>
				<p class="mt-1.5 text-[10px] text-slate-500">
					{formatBytes(data.storage.remaining)} tersisa dari {formatBytes(data.storage.limit)}
				</p>
			</div>

			<a
				href={resolve('/(app)/settings')}
				class={cn(
					'mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
					page.url.pathname.startsWith('/settings')
						? 'bg-white/10 text-white'
						: 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
				)}
			>
				<Icon name="settings" size={18} />
				Akun
			</a>

			<div class="mt-1 flex items-center gap-3 border-t border-white/10 px-2 pt-3 pb-1">
				<Avatar name={data.user.name} size="sm" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-white">{data.user.name}</p>
					<p class="truncate text-xs text-slate-500">
						{roleLabel[data.role] ?? data.role}
					</p>
				</div>
				<form method="POST" action={resolve('/logout')}>
					<button
						type="submit"
						class="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
						title="Keluar"
						aria-label="Keluar"
					>
						<Icon name="logout" size={17} />
					</button>
				</form>
			</div>
		</div>
	</aside>

	<main class="lg:pl-72">
		<div class="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
			{@render children()}
		</div>
	</main>
</div>
