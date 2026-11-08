<script lang="ts">
	import { deserialize, enhance } from '$app/forms';
	import { invalidate, refreshAll } from '$app/navigation';
	import { SvelteMap } from 'svelte/reactivity';
	import Avatar from '#lib/components/Avatar.svelte';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PriorityDot from '#lib/components/PriorityDot.svelte';
	import TaskModal from '#lib/components/TaskModal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { APP_TIMEZONE, formatDate } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Task = (typeof data.tasks)[number];
	type Column = (typeof data.columns)[number];

	let taskOpen = $state(false);
	let selectedTask = $state<Task | null>(null);
	let defaultColumnId = $state<string | null>(null);

	let columnOpen = $state(false);
	let editColumn = $state<Column | null>(null);
	let columnName = $state('');
	let columnDone = $state(false);

	let dragging = $state<string | null>(null);
	let dragOver = $state<string | null>(null);
	let overrides = $state<Record<string, string>>({});
	let lastSynced = $state('');

	async function syncBoard() {
		if (document.visibilityState !== 'visible' || dragging) return;

		await invalidate('app:board');
		lastSynced = new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: APP_TIMEZONE
		}).format(new Date());
	}

	$effect(() => {
		const timer = setInterval(syncBoard, 10_000);
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') syncBoard();
		};

		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});

	const today = $derived(data.today);
	const canManage = $derived(data.role === 'owner' || data.role === 'admin');
	const totalTasks = $derived(data.tasks.length);

	const grouped = $derived.by(() => {
		const map = new SvelteMap<string, Task[]>();
		for (const column of data.columns) map.set(column.id, []);
		for (const item of data.tasks) {
			const columnId = overrides[item.id] ?? item.columnId;
			map.get(columnId)?.push(item);
		}
		return map;
	});

	$effect(() => {
		if (!columnOpen) return;
		columnName = editColumn?.name ?? '';
		columnDone = editColumn?.isDone ?? false;
	});

	function openCreate(columnId?: string) {
		selectedTask = null;
		defaultColumnId = columnId ?? data.columns[0]?.id ?? null;
		taskOpen = true;
	}

	function openEdit(item: Task) {
		selectedTask = item;
		taskOpen = true;
	}

	function openColumnEditor(column: Column | null) {
		editColumn = column;
		columnOpen = true;
	}

	async function moveTask(taskId: string, columnId: string) {
		const current = data.tasks.find((item) => item.id === taskId);
		if (!current || (overrides[taskId] ?? current.columnId) === columnId) return;

		overrides = { ...overrides, [taskId]: columnId };

		try {
			const body = new FormData();
			body.set('taskId', taskId);
			body.set('columnId', columnId);

			const response = await fetch('?/moveTask', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});

			const result = deserialize<{ success: boolean }, { error: string }>(await response.text());

			if (result.type === 'failure') {
				toasts.error(result.data?.error ?? 'Gagal memindahkan task.');
				const next = { ...overrides };
				delete next[taskId];
				overrides = next;
				return;
			}

			if (result.type === 'error') {
				toasts.error('Terjadi kesalahan saat memindahkan task.');
				const next = { ...overrides };
				delete next[taskId];
				overrides = next;
				return;
			}

			await refreshAll();
			overrides = {};
			toasts.success('Task dipindahkan.');
		} catch {
			const next = { ...overrides };
			delete next[taskId];
			overrides = next;
			toasts.error('Tidak dapat memindahkan task.');
		} finally {
			dragging = null;
			dragOver = null;
		}
	}

	function handleDrop(event: DragEvent, columnId: string) {
		event.preventDefault();
		const taskId = event.dataTransfer?.getData('text/plain') || dragging;
		dragging = null;
		dragOver = null;
		if (taskId) moveTask(taskId, columnId);
	}
</script>

<svelte:head>
	<title>Board · {data.project?.name ?? 'Project'}</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200"
			>
				<Icon name="kanban" size={13} />
				{data.columns.length} kolom
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200"
			>
				<Icon name="check-circle" size={13} />
				{totalTasks} task
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200"
				title="Board diperbarui otomatis setiap 10 detik"
			>
				<span class="size-1.5 animate-pulse rounded-full bg-emerald-500"></span>
				Auto-sync{lastSynced ? ` · ${lastSynced}` : ''}
			</span>
		</div>

		<div class="flex items-center gap-2">
			{#if canManage}
				<button
					type="button"
					onclick={() => openColumnEditor(null)}
					class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
				>
					<Icon name="plus" size={15} />
					Kolom
				</button>
			{/if}
			<button
				type="button"
				onclick={() => openCreate()}
				disabled={!data.columns.length}
				class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Icon name="plus" size={15} />
				Task baru
			</button>
		</div>
	</div>

	<div
		class="board-scroll -mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
	>
		{#each data.columns as column (column.id)}
			{@const columnTasks = grouped.get(column.id) ?? []}
			<section
				class={`flex w-72 shrink-0 flex-col rounded-2xl border bg-slate-100/70 transition ${
					dragOver === column.id
						? 'border-indigo-400 ring-2 ring-indigo-500/20'
						: 'border-slate-200'
				}`}
			>
				<header class="flex items-center gap-2 px-3 py-3">
					<span class="flex items-center gap-2 text-sm font-semibold text-slate-700">
						{column.name}
						{#if column.isDone}
							<Icon name="check-circle" size={14} className="text-emerald-500" />
						{/if}
					</span>
					<span class="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
						{columnTasks.length}
					</span>

					{#if canManage}
						<details class="relative ml-auto">
							<summary
								class="flex cursor-pointer list-none items-center justify-center rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
								aria-label={`Menu kolom ${column.name}`}
							>
								<Icon name="more" size={16} />
							</summary>
							<div
								class="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
							>
								<button
									type="button"
									onclick={() => openColumnEditor(column)}
									class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
								>
									<Icon name="edit" size={14} />
									Ubah kolom
								</button>
								<form method="POST" action="?/moveColumn" use:enhance class="contents">
									<input type="hidden" name="columnId" value={column.id} />
									<input type="hidden" name="direction" value="up" />
									<button
										type="submit"
										class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
									>
										<Icon name="chevron-left" size={14} />
										Geser ke kiri
									</button>
								</form>
								<form method="POST" action="?/moveColumn" use:enhance class="contents">
									<input type="hidden" name="columnId" value={column.id} />
									<input type="hidden" name="direction" value="down" />
									<button
										type="submit"
										class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
									>
										<Icon name="chevron-right" size={14} />
										Geser ke kanan
									</button>
								</form>
								<form
									method="POST"
									action="?/deleteColumn"
									use:confirmAction={{
										title: 'Hapus kolom?',
										message: `Kolom "${column.name}" akan dihapus. Kolom yang masih memiliki task tidak dapat dihapus.`,
										confirmLabel: 'Hapus kolom'
									}}
									use:enhance={() => {
										return async ({ result, update }) => {
											await update();
											if (result.type === 'success') toasts.success('Kolom dihapus.');
											else if (result.type === 'failure')
												toasts.error(
													typeof result.data?.error === 'string'
														? result.data.error
														: 'Gagal menghapus kolom.'
												);
										};
									}}
								>
									<input type="hidden" name="columnId" value={column.id} />
									<button
										type="submit"
										class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
									>
										<Icon name="trash" size={14} />
										Hapus kolom
									</button>
								</form>
							</div>
						</details>
					{/if}
				</header>

				<div
					class="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2"
					ondragover={(event) => {
						event.preventDefault();
						dragOver = column.id;
					}}
					ondragleave={(event) => {
						if (event.currentTarget === event.target) dragOver = null;
					}}
					ondrop={(event) => handleDrop(event, column.id)}
					role="region"
					aria-label={`Drop zone kolom ${column.name}`}
				>
					{#each columnTasks as item (item.id)}
						<div
							draggable="true"
							ondragstart={(event) => {
								dragging = item.id;
								event.dataTransfer?.setData('text/plain', item.id);
								if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
							}}
							ondragend={() => {
								dragging = null;
								dragOver = null;
							}}
							onclick={() => openEdit(item)}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') openEdit(item);
							}}
							role="button"
							tabindex="0"
							class={`group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md active:cursor-grabbing ${
								dragging === item.id ? 'opacity-40' : ''
							}`}
						>
							<div class="flex items-start gap-2">
								<h3 class="line-clamp-2 flex-1 text-sm leading-snug font-medium text-slate-800">
									{item.title}
								</h3>
								<Icon
									name="grip"
									size={15}
									className="mt-0.5 shrink-0 text-slate-300 group-hover:text-slate-400"
								/>
							</div>

							{#if item.description}
								<p class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
									{item.description}
								</p>
							{/if}

							{#if item.formats.length}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each item.formats.slice(0, 4) as format (format)}
										<span
											class="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
										>
											{format}
										</span>
									{/each}
									{#if item.formats.length > 4}
										<span
											class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
										>
											+{item.formats.length - 4}
										</span>
									{/if}
								</div>
							{/if}

							<div class="mt-3 flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<PriorityDot priority={item.priority} />
									{#if item.dueDate}
										<span
											class={`inline-flex items-center gap-1 text-[11px] font-medium ${
												item.dueDate < today ? 'text-rose-600' : 'text-slate-400'
											}`}
										>
											<Icon name="clock" size={12} />
											{formatDate(item.dueDate)}
										</span>
									{/if}
								</div>
								{#if item.assignees.length}
									<div
										class="flex items-center -space-x-1.5"
										title={item.assignees.map((assignee) => assignee.name).join(', ')}
									>
										{#each item.assignees.slice(0, 3) as assignee (assignee.id)}
											<span class="rounded-full ring-2 ring-white">
												<Avatar name={assignee.name} size="xs" />
											</span>
										{/each}
										{#if item.assignees.length > 3}
											<span
												class="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
											>
												+{item.assignees.length - 3}
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<button
							type="button"
							onclick={() => openCreate(column.id)}
							class="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"
						>
							<Icon name="plus" size={16} className="mb-1" />
							Tarik task ke sini atau tambah
						</button>
					{/each}

					{#if columnTasks.length > 0}
						<button
							type="button"
							onclick={() => openCreate(column.id)}
							class="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-slate-400 transition hover:bg-white hover:text-indigo-600"
						>
							<Icon name="plus" size={14} />
							Tambah task
						</button>
					{/if}
				</div>
			</section>
		{/each}

		{#if canManage}
			<button
				type="button"
				onclick={() => openColumnEditor(null)}
				class="flex h-24 w-64 shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 text-sm font-medium text-slate-400 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
			>
				<Icon name="plus" size={17} />
				Tambah kolom
			</button>
		{/if}
	</div>

	{#if !data.columns.length}
		<div
			class="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center"
		>
			<p class="text-sm font-medium text-slate-700">Board masih kosong</p>
			<p class="mt-1 text-xs text-slate-400">
				Tambahkan kolom terlebih dahulu untuk mulai mengelola task.
			</p>
		</div>
	{/if}
</div>

<TaskModal
	bind:open={taskOpen}
	task={selectedTask}
	columns={data.columns}
	members={data.members}
	{defaultColumnId}
/>

<Modal
	bind:open={columnOpen}
	title={editColumn ? 'Ubah kolom' : 'Kolom baru'}
	description={editColumn
		? 'Ubah nama atau tandai kolom sebagai status selesai.'
		: 'Kolom membantu memetakan alur kerja tim.'}
>
	<form
		method="POST"
		action={editColumn ? '?/updateColumn' : '?/createColumn'}
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success') {
					columnOpen = false;
					toasts.success(editColumn ? 'Kolom diperbarui.' : 'Kolom ditambahkan.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string' ? result.data.error : 'Gagal menyimpan kolom.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		{#if editColumn}
			<input type="hidden" name="columnId" value={editColumn.id} />
		{/if}

		<div>
			<label for="column-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama kolom
			</label>
			<input
				id="column-name"
				name="name"
				type="text"
				required
				maxlength="60"
				bind:value={columnName}
				placeholder="Contoh: In Progress"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<label class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
			<input
				type="checkbox"
				name="isDone"
				bind:checked={columnDone}
				class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
			/>
			<span>
				<span class="block text-sm font-medium text-slate-700">Tandai sebagai selesai</span>
				<span class="mt-0.5 block text-xs text-slate-400">
					Task di kolom ini dihitung selesai pada statistik dan progress.
				</span>
			</span>
		</label>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (columnOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
			>
				<Icon name="check" size={16} />
				{editColumn ? 'Simpan' : 'Tambah kolom'}
			</button>
		</div>
	</form>
</Modal>
