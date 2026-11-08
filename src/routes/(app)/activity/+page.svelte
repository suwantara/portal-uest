<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- query string is appended to a resolved path */
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { formatDateTime } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const categoryLabels: Record<string, string> = {
		auth: 'Autentikasi',
		project: 'Project',
		task: 'Task',
		document: 'Dokumen',
		link: 'Link',
		member: 'Anggota',
		account: 'Akun'
	};

	const categoryStyles: Record<string, string> = {
		auth: 'border-sky-100 bg-sky-50 text-sky-700',
		project: 'border-indigo-100 bg-indigo-50 text-indigo-700',
		task: 'border-violet-100 bg-violet-50 text-violet-700',
		document: 'border-amber-100 bg-amber-50 text-amber-700',
		link: 'border-emerald-100 bg-emerald-50 text-emerald-700',
		member: 'border-rose-100 bg-rose-50 text-rose-700',
		account: 'border-slate-200 bg-slate-100 text-slate-700'
	};

	const categoryIcons: Record<string, string> = {
		auth: 'key',
		project: 'folder',
		task: 'kanban',
		document: 'file',
		link: 'link',
		member: 'users',
		account: 'user'
	};

	const hasFilters = $derived(
		Boolean(
			data.filters.category || data.filters.actor || data.filters.q || data.filters.range !== '24h'
		)
	);

	const firstItem = $derived(
		data.pagination.total === 0 ? 0 : (data.pagination.page - 1) * data.pagination.pageSize + 1
	);
	const lastItem = $derived(
		Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)
	);

	function pageQuery(target: number): string {
		const params = new SvelteURLSearchParams(page.url.search);
		params.set('page', String(target));
		return params.toString();
	}
</script>

<svelte:head>
	<title>Log aktivitas · Portal UEST</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight text-slate-900">Log aktivitas</h1>
				<span
					class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
				>
					<Icon name="shield" size={12} />
					Khusus owner
				</span>
			</div>
			<p class="mt-1 max-w-2xl text-sm text-slate-500">
				Pantau siapa yang masuk dan aktivitas apa yang dilakukan di workspace.
			</p>
		</div>
	</header>

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-xs font-medium text-slate-400">Aktivitas 24 jam</p>
				<span
					class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"
				>
					<Icon name="activity" size={16} />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
				{data.stats.activities}
			</p>
			<p class="mt-1 text-xs text-slate-400">Total aksi tercatat</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-xs font-medium text-slate-400">Login 24 jam</p>
				<span class="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
					<Icon name="key" size={16} />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{data.stats.logins}</p>
			<p class="mt-1 text-xs text-slate-400">Sesi masuk berhasil</p>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<p class="text-xs font-medium text-slate-400">Anggota aktif</p>
				<span
					class="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
				>
					<Icon name="users" size={16} />
				</span>
			</div>
			<p class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
				{data.stats.activeUsers}
			</p>
			<p class="mt-1 text-xs text-slate-400">Punya aktivitas dalam 24 jam</p>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
		<form method="GET" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_170px_160px_auto]">
			<div class="relative">
				<label for="activity-search" class="sr-only">Cari aktivitas</label>
				<span
					class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
				>
					<Icon name="search" size={15} />
				</span>
				<input
					id="activity-search"
					type="search"
					name="q"
					value={data.filters.q}
					maxlength="100"
					placeholder="Cari nama, email, aktivitas, atau project..."
					class="w-full rounded-xl border-slate-300 py-2.5 pr-3 pl-9 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				/>
			</div>

			<div>
				<label for="activity-category" class="sr-only">Kategori</label>
				<select
					id="activity-category"
					name="category"
					class="w-full rounded-xl border-slate-300 py-2.5 pr-8 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					<option value="" selected={!data.filters.category}>Semua kategori</option>
					{#each data.categories as category (category)}
						<option value={category} selected={data.filters.category === category}>
							{categoryLabels[category] ?? category}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="activity-actor" class="sr-only">Anggota</label>
				<select
					id="activity-actor"
					name="actor"
					class="w-full rounded-xl border-slate-300 py-2.5 pr-8 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					<option value="" selected={!data.filters.actor}>Semua anggota</option>
					{#each data.actors as actor (actor.email)}
						<option value={actor.email} selected={data.filters.actor === actor.email}>
							{actor.name}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="activity-range" class="sr-only">Rentang waktu</label>
				<select
					id="activity-range"
					name="range"
					class="w-full rounded-xl border-slate-300 py-2.5 pr-8 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					{#each data.ranges as range (range.value)}
						<option value={range.value} selected={data.filters.range === range.value}>
							{range.label}
						</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2">
				<button
					type="submit"
					class="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
				>
					<Icon name="search" size={15} />
					Terapkan
				</button>
				{#if hasFilters}
					<a
						href={`${resolve('/(app)/activity')}?range=24h`}
						class="inline-flex h-[42px] items-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
					>
						Reset
					</a>
				{/if}
			</div>
		</form>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div
			class="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5"
		>
			<div>
				<h2 class="text-sm font-semibold text-slate-900">Aktivitas terbaru</h2>
				<p class="text-xs text-slate-400">
					{data.pagination.total} catatan pada filter ini
				</p>
			</div>
			<span
				class="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-500"
				title={`Log lebih lama dari ${data.retentionHours} jam otomatis dihapus`}
			>
				<Icon name="clock" size={13} />
				Retensi {data.retentionHours} jam
			</span>
		</div>

		{#if data.activities.length}
			<ul class="divide-y divide-slate-100">
				{#each data.activities as activity (activity.id)}
					<li class="flex gap-3 px-4 py-4 transition hover:bg-slate-50/60 sm:px-5">
						<Avatar name={activity.actorName} size="sm" />

						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
								<span class="truncate text-sm font-semibold text-slate-800">
									{activity.actorName}
								</span>
								<span class="truncate text-xs text-slate-400">{activity.actorEmail}</span>
								<span
									class={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
										categoryStyles[activity.category] ?? categoryStyles.account
									}`}
								>
									<Icon name={categoryIcons[activity.category] ?? 'activity'} size={10} />
									{categoryLabels[activity.category] ?? activity.category}
								</span>
							</div>

							<p class="mt-1 text-sm leading-relaxed text-slate-600">{activity.description}</p>

							<div
								class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400"
							>
								<span class="inline-flex items-center gap-1">
									<Icon name="clock" size={11} />
									{formatDateTime(activity.createdAt)}
								</span>
								{#if activity.projectName}
									<span class="inline-flex items-center gap-1">
										<Icon name="folder" size={11} />
										{activity.projectName}
									</span>
								{/if}
								{#if activity.ipAddress}
									<span
										class="inline-flex items-center gap-1"
										title={activity.userAgent ?? undefined}
									>
										<Icon name="shield" size={11} />
										{activity.ipAddress}
									</span>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			</ul>

			{#if data.pagination.pageCount > 1}
				<div
					class="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
				>
					<p class="text-xs text-slate-400">
						Menampilkan {firstItem}–{lastItem} dari {data.pagination.total}
					</p>
					<div class="flex items-center gap-2">
						{#if data.pagination.page > 1}
							<a
								href={`${resolve('/(app)/activity')}?${pageQuery(data.pagination.page - 1)}`}
								class="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
							>
								<Icon name="chevron-left" size={13} />
								Sebelumnya
							</a>
						{/if}
						<span class="text-xs font-medium text-slate-500">
							Halaman {data.pagination.page} / {data.pagination.pageCount}
						</span>
						{#if data.pagination.page < data.pagination.pageCount}
							<a
								href={`${resolve('/(app)/activity')}?${pageQuery(data.pagination.page + 1)}`}
								class="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
							>
								Berikutnya
								<Icon name="chevron-right" size={13} />
							</a>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<div class="flex flex-col items-center justify-center px-6 py-16 text-center">
				<span
					class="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
				>
					<Icon name="activity" size={22} />
				</span>
				<h3 class="mt-3 text-sm font-semibold text-slate-800">Belum ada aktivitas</h3>
				<p class="mt-1 max-w-sm text-xs text-slate-400">
					{hasFilters
						? 'Tidak ada catatan yang cocok dengan filter. Coba ubah kata kunci atau rentang waktu.'
						: 'Aktivitas login dan perubahan data akan muncul di sini.'}
				</p>
			</div>
		{/if}
	</div>

	<div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
		<div class="flex gap-3">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
			>
				<Icon name="shield" size={16} />
			</span>
			<div>
				<p class="text-sm font-semibold text-amber-900">Log bersifat sementara</p>
				<p class="mt-0.5 text-xs leading-relaxed text-amber-700">
					Log aktivitas hanya disimpan maksimal {data.retentionHours} jam, lalu dihapus otomatis. Alamat
					IP dan user agent dicatat untuk membantu investigasi keamanan.
				</p>
			</div>
		</div>
	</div>
</div>
