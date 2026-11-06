<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import Icon from '#lib/components/Icon.svelte';
	import TaskModal from '#lib/components/TaskModal.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Task = (typeof data.tasks)[number];

	type CalendarDay = {
		date: string;
		day: number;
		isToday: boolean;
		tasks: Task[];
	};

	let taskOpen = $state(false);
	let selectedTask = $state<Task | null>(null);
	let defaultDueDate = $state<string | null>(null);

	const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
	const today = $derived(data.today);

	const monthLabel = $derived.by(() => {
		const year = Number(data.month.slice(0, 4));
		const month = Number(data.month.slice(5, 7));
		return new Intl.DateTimeFormat('id-ID', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(year, month - 1, 1)));
	});

	const days = $derived.by(() => {
		const year = Number(data.month.slice(0, 4));
		const month = Number(data.month.slice(5, 7));
		const first = new Date(Date.UTC(year, month - 1, 1));
		const offset = (first.getUTCDay() + 6) % 7;
		const total = new Date(Date.UTC(year, month, 0)).getUTCDate();

		const byDate = new SvelteMap<string, Task[]>();
		for (const item of data.tasks) {
			if (!item.dueDate) continue;
			const list = byDate.get(item.dueDate) ?? [];
			list.push(item);
			byDate.set(item.dueDate, list);
		}

		const cells: (CalendarDay | null)[] = Array.from({ length: offset }, () => null);

		for (let day = 1; day <= total; day++) {
			const date = `${data.month}-${String(day).padStart(2, '0')}`;
			cells.push({
				date,
				day,
				isToday: date === today,
				tasks: byDate.get(date) ?? []
			});
		}

		while (cells.length % 7 !== 0) cells.push(null);

		return cells;
	});

	function shiftMonth(delta: number): string {
		const year = Number(data.month.slice(0, 4));
		const month = Number(data.month.slice(5, 7));
		const date = new Date(Date.UTC(year, month - 1 + delta, 1));
		return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
	}

	function openCreate(date?: string) {
		selectedTask = null;
		defaultDueDate = date ?? null;
		taskOpen = true;
	}

	function openEdit(item: Task) {
		selectedTask = item;
		defaultDueDate = null;
		taskOpen = true;
	}

	function chipClass(item: Task): string {
		if (item.isDone) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		if (item.priority === 'urgent') return 'border-rose-200 bg-rose-50 text-rose-700';
		if (item.priority === 'high') return 'border-amber-200 bg-amber-50 text-amber-700';
		return 'border-indigo-200 bg-indigo-50 text-indigo-700';
	}

	function barClass(item: Task): string {
		if (item.isDone) return 'bg-emerald-400';
		if (item.priority === 'urgent') return 'bg-rose-400';
		if (item.priority === 'high') return 'bg-amber-400';
		return 'bg-indigo-400';
	}
</script>

<svelte:head>
	<title>Kalender · Portal UEST</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-2">
			<div class="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm">
				<a
					href={resolve(`/(app)/projects/[id]/calendar?month=${shiftMonth(-1)}`, {
						id: data.projectId
					})}
					class="rounded-l-xl p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
					aria-label="Bulan sebelumnya"
				>
					<Icon name="chevron-left" size={17} />
				</a>
				<span
					class="min-w-40 border-x border-slate-200 px-4 py-1.5 text-center text-sm font-semibold text-slate-800"
				>
					{monthLabel}
				</span>
				<a
					href={resolve(`/(app)/projects/[id]/calendar?month=${shiftMonth(1)}`, {
						id: data.projectId
					})}
					class="rounded-r-xl p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
					aria-label="Bulan berikutnya"
				>
					<Icon name="chevron-right" size={17} />
				</a>
			</div>

			<a
				href={resolve(`/(app)/projects/[id]/calendar?month=${data.today.slice(0, 7)}`, {
					id: data.projectId
				})}
				class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
			>
				Hari ini
			</a>
		</div>

		<button
			type="button"
			onclick={() => openCreate()}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			<Icon name="plus" size={16} />
			Task baru
		</button>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
			{#each weekdays as weekday (weekday)}
				<div
					class="px-2 py-2.5 text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase"
				>
					{weekday}
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-7">
			{#each days as day, index (day?.date ?? `empty-${index}`)}
				{#if day}
					<div
						class={`group relative min-h-24 border-r border-b border-slate-100 p-1.5 last:border-r-0 sm:min-h-32 sm:p-2 ${
							day.isToday ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'
						}`}
					>
						<div class="flex items-center justify-between">
							<span
								class={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
									day.isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'
								}`}
							>
								{day.day}
							</span>
							<button
								type="button"
								onclick={() => openCreate(day.date)}
								class="rounded-md p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-indigo-50 hover:text-indigo-600 focus:opacity-100"
								aria-label={`Tambah task pada ${day.date}`}
							>
								<Icon name="plus" size={13} />
							</button>
						</div>

						<div class="mt-1 space-y-1">
							{#each day.tasks.slice(0, 3) as item (item.id)}
								<button
									type="button"
									onclick={() => openEdit(item)}
									class={`hidden w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-95 sm:block ${chipClass(item)}`}
									title={item.title}
								>
									{item.title}
								</button>
								<button
									type="button"
									onclick={() => openEdit(item)}
									class="flex w-full items-center rounded py-0.5 transition hover:bg-slate-100 sm:hidden"
									title={item.title}
									aria-label={item.title}
								>
									<span class={`h-1.5 w-full rounded-full ${barClass(item)}`}></span>
								</button>
							{/each}
							{#if day.tasks.length > 3}
								<p class="px-1 text-[10px] font-medium text-slate-400">
									+{day.tasks.length - 3} task lainnya
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<div
						class="min-h-24 border-r border-b border-slate-100 bg-slate-50/40 last:border-r-0 sm:min-h-32"
					></div>
				{/if}
			{/each}
		</div>
	</div>

	<p class="text-xs text-slate-400">
		Tip: klik tanggal untuk menambah task, atau klik task untuk mengubah detailnya.
	</p>
</div>

<TaskModal
	bind:open={taskOpen}
	task={selectedTask}
	columns={data.columns}
	members={data.members}
	{defaultDueDate}
/>
