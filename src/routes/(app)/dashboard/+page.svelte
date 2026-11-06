<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import PriorityDot from '#lib/components/PriorityDot.svelte';
	import { formatDate } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateLabel = $derived(
		new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(`${data.today}T00:00:00`))
	);

	const firstName = $derived(data.user.name.split(' ')[0]);

	const statCards = $derived([
		{
			label: 'Tugas aktif',
			value: data.stats.openTasks,
			detail: `${data.stats.doneTasks} task selesai`,
			icon: 'kanban',
			tone: 'bg-indigo-50 text-indigo-600'
		},
		{
			label: 'Terlambat',
			value: data.stats.overdueTasks,
			detail: data.stats.overdueTasks > 0 ? 'Perlu perhatian' : 'Tidak ada yang telat',
			icon: 'clock',
			tone: 'bg-rose-50 text-rose-600'
		},
		{
			label: 'Project aktif',
			value: data.projects.length,
			detail: `${data.stats.members} anggota tim`,
			icon: 'folder',
			tone: 'bg-emerald-50 text-emerald-600'
		},
		{
			label: 'Aset tim',
			value: data.stats.documents + data.stats.links,
			detail: `${data.stats.documents} dokumen · ${data.stats.links} link`,
			icon: 'layers',
			tone: 'bg-amber-50 text-amber-600'
		}
	]);

	function daysUntil(date: string): string {
		const target = new Date(`${date}T00:00:00`);
		const today = new Date(`${data.today}T00:00:00`);
		const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
		if (diff < 0) return `Telat ${Math.abs(diff)} hari`;
		if (diff === 0) return 'Hari ini';
		if (diff === 1) return 'Besok';
		return `${diff} hari lagi`;
	}
</script>

<svelte:head>
	<title>Dashboard · Portal UEST</title>
</svelte:head>

<div class="space-y-8">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-sm font-medium text-indigo-600">{dateLabel}</p>
			<h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
				Halo, {firstName} 👋
			</h1>
			<p class="mt-2 text-sm text-slate-500">
				Ini ringkasan pekerjaan tim {data.workspace.name} hari ini.
			</p>
		</div>

		<a
			href={resolve('/(app)/projects')}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
		>
			<Icon name="folder-plus" size={17} />
			Kelola project
		</a>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each statCards as stat (stat.label)}
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-slate-500">{stat.label}</p>
						<p class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
					</div>
					<span class={`flex size-10 items-center justify-center rounded-xl ${stat.tone}`}>
						<Icon name={stat.icon} size={19} />
					</span>
				</div>
				<p class="mt-3 text-xs text-slate-400">{stat.detail}</p>
			</div>
		{/each}
	</section>

	<div class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
		<section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<div>
					<h2 class="text-sm font-semibold text-slate-900">Tugas saya</h2>
					<p class="mt-0.5 text-xs text-slate-400">
						Task yang di-assign ke Anda dan belum selesai.
					</p>
				</div>
				<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
					{data.myTasks.length}
				</span>
			</div>

			<div class="divide-y divide-slate-100">
				{#each data.myTasks as task (task.id)}
					<a
						href={resolve('/(app)/projects/[id]/board', { id: task.projectId })}
						class="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50"
					>
						<span
							class="mt-1.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300"
						>
							<span class="size-1.5 rounded-full bg-slate-300"></span>
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-slate-800">{task.title}</p>
							<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
								<span class="inline-flex items-center gap-1.5">
									<span
										class="size-1.5 rounded-full"
										style={`background-color: ${task.projectColor}`}
									></span>
									{task.projectName}
								</span>
								<span>{task.columnName}</span>
								<PriorityDot priority={task.priority} label />
							</div>
						</div>
						<div class="shrink-0 text-right">
							{#if task.dueDate}
								<p
									class={`text-xs font-medium ${
										task.dueDate < data.today ? 'text-rose-600' : 'text-slate-500'
									}`}
								>
									{formatDate(task.dueDate)}
								</p>
								<p class="mt-0.5 text-[11px] text-slate-400">{daysUntil(task.dueDate)}</p>
							{:else}
								<p class="text-xs text-slate-300">Tanpa tenggat</p>
							{/if}
						</div>
					</a>
				{:else}
					<div class="flex flex-col items-center justify-center px-6 py-14 text-center">
						<span
							class="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
						>
							<Icon name="check-circle" size={22} />
						</span>
						<p class="mt-3 text-sm font-medium text-slate-700">Tidak ada tugas aktif</p>
						<p class="mt-1 text-xs text-slate-400">
							Semua task yang di-assign ke Anda sudah beres.
						</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div class="border-b border-slate-100 px-5 py-4">
				<h2 class="text-sm font-semibold text-slate-900">Tenggat 7 hari ke depan</h2>
				<p class="mt-0.5 text-xs text-slate-400">Task tim yang perlu diselesaikan minggu ini.</p>
			</div>

			<div class="divide-y divide-slate-100">
				{#each data.upcomingTasks as task (task.id)}
					<a
						href={resolve('/(app)/projects/[id]/board', { id: task.projectId })}
						class="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"
					>
						<div
							class="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
						>
							<span class="text-[10px] font-medium text-slate-400 uppercase">
								{new Intl.DateTimeFormat('id-ID', { month: 'short' })
									.format(new Date(`${task.dueDate}T00:00:00`))
									.replace('.', '')}
							</span>
							<span class="text-sm leading-none font-semibold text-slate-700">
								{new Date(`${task.dueDate}T00:00:00`).getDate()}
							</span>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-slate-800">{task.title}</p>
							<p class="mt-0.5 truncate text-xs text-slate-400">{task.projectName}</p>
						</div>
						<span class="text-[11px] font-medium text-slate-400">
							{task.dueDate ? daysUntil(task.dueDate) : ''}
						</span>
					</a>
				{:else}
					<div class="flex flex-col items-center justify-center px-6 py-14 text-center">
						<span
							class="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"
						>
							<Icon name="calendar" size={22} />
						</span>
						<p class="mt-3 text-sm font-medium text-slate-700">Minggu ini kosong</p>
						<p class="mt-1 text-xs text-slate-400">Belum ada task dengan tenggat terdekat.</p>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<section>
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-sm font-semibold text-slate-900">Project</h2>
				<p class="mt-0.5 text-xs text-slate-400">Progress task per project.</p>
			</div>
			<a
				href={resolve('/(app)/projects')}
				class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
			>
				Lihat semua
				<Icon name="arrow-right" size={14} />
			</a>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.projects as project (project.id)}
				{@const progress = project.totalTasks
					? Math.round((project.doneTasks / project.totalTasks) * 100)
					: 0}
				<a
					href={resolve('/(app)/projects/[id]/board', { id: project.id })}
					class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
				>
					<div class="flex items-start justify-between">
						<span
							class="flex size-10 items-center justify-center rounded-xl text-white"
							style={`background-color: ${project.color}`}
						>
							<Icon name="kanban" size={18} />
						</span>
						<Icon
							name="arrow-right"
							size={18}
							className="text-slate-300 transition group-hover:text-indigo-500"
						/>
					</div>
					<h3 class="mt-4 text-sm font-semibold text-slate-900">{project.name}</h3>
					<p class="mt-1 line-clamp-2 min-h-8 text-xs text-slate-400">
						{project.description || 'Belum ada deskripsi.'}
					</p>
					<div class="mt-4 flex items-center justify-between text-xs text-slate-400">
						<span>{project.doneTasks}/{project.totalTasks} task selesai</span>
						<span class="font-medium text-slate-600">{progress}%</span>
					</div>
					<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
						<div
							class="h-full rounded-full bg-indigo-500 transition-all"
							style={`width: ${progress}%`}
						></div>
					</div>
				</a>
			{:else}
				<div
					class="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center"
				>
					<p class="text-sm font-medium text-slate-700">Belum ada project</p>
					<p class="mt-1 text-xs text-slate-400">
						Buat project pertama untuk mulai mengelola task.
					</p>
					<a
						href={resolve('/(app)/projects')}
						class="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
					>
						<Icon name="plus" size={14} />
						Buat project
					</a>
				</div>
			{/each}
		</div>
	</section>
</div>
