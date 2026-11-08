<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Avatar from './Avatar.svelte';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';

	type Priority = 'low' | 'medium' | 'high' | 'urgent';

	type TaskData = {
		id: string;
		title: string;
		description: string | null;
		priority: Priority;
		formats?: string[];
		columnId: string;
		assignees?: { id: string; name: string }[];
		dueDate: string | null;
	};

	type Column = { id: string; name: string };
	type Member = { id: string; name: string };

	type Props = {
		open?: boolean;
		task?: TaskData | null;
		columns: Column[];
		members: Member[];
		defaultColumnId?: string | null;
		defaultDueDate?: string | null;
	};

	let {
		open = $bindable(false),
		task = null,
		columns,
		members,
		defaultColumnId = null,
		defaultDueDate = null
	}: Props = $props();

	let title = $state('');
	let description = $state('');
	let priority = $state<Priority>('medium');
	let selectedFormats = $state<string[]>([]);
	let customFormat = $state('');
	let columnId = $state('');
	let selectedAssigneeIds = $state<string[]>([]);
	let dueDate = $state('');
	let submitting = $state(false);

	const isEdit = $derived(Boolean(task));
	const formatOptions = ['IG', 'Feed', 'Story', 'Reels', 'A4', 'A3', 'A5', 'Banner', 'Website'];

	const customFormats = $derived(
		selectedFormats.filter(
			(format) => !formatOptions.some((option) => option.toLowerCase() === format.toLowerCase())
		)
	);

	$effect(() => {
		if (!open) return;

		title = task?.title ?? '';
		description = task?.description ?? '';
		priority = task?.priority ?? 'medium';
		selectedFormats = [...(task?.formats ?? [])];
		customFormat = '';
		columnId = task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '';
		selectedAssigneeIds = task?.assignees?.map((assignee) => assignee.id) ?? [];
		dueDate = task?.dueDate ?? defaultDueDate ?? '';
		submitting = false;
	});

	function toggleFormat(format: string) {
		const exists = selectedFormats.some(
			(selected) => selected.toLowerCase() === format.toLowerCase()
		);

		if (exists) {
			selectedFormats = selectedFormats.filter(
				(selected) => selected.toLowerCase() !== format.toLowerCase()
			);
			return;
		}

		if (selectedFormats.length >= 10) {
			toasts.error('Maksimal 10 platform/format per task.');
			return;
		}

		selectedFormats = [...selectedFormats, format];
	}

	function addCustomFormat() {
		const value = customFormat.trim();

		if (!value) return;
		if (selectedFormats.some((format) => format.toLowerCase() === value.toLowerCase())) {
			customFormat = '';
			return;
		}
		if (selectedFormats.length >= 10) {
			toasts.error('Maksimal 10 platform/format per task.');
			return;
		}

		selectedFormats = [...selectedFormats, value.slice(0, 30)];
		customFormat = '';
	}

	function toggleAssignee(userId: string) {
		if (selectedAssigneeIds.includes(userId)) {
			selectedAssigneeIds = selectedAssigneeIds.filter((id) => id !== userId);
			return;
		}

		if (selectedAssigneeIds.length >= 20) {
			toasts.error('Maksimal 20 assignee per task.');
			return;
		}

		selectedAssigneeIds = [...selectedAssigneeIds, userId];
	}
</script>

<Modal
	bind:open
	title={isEdit ? 'Edit task' : 'Task baru'}
	description={isEdit
		? 'Perbarui detail, status, atau penanggung jawab task.'
		: 'Tambahkan pekerjaan ke board project.'}
	size="lg"
>
	<form
		id="task-form"
		method="POST"
		action={isEdit ? '?/updateTask' : '?/createTask'}
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;

				if (result.type === 'success') {
					open = false;
					toasts.success(isEdit ? 'Task diperbarui.' : 'Task berhasil dibuat.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string' ? result.data.error : 'Gagal menyimpan task.'
					);
				} else if (result.type === 'error') {
					toasts.error('Terjadi kesalahan saat menyimpan task.');
				}
			};
		}}
		class="space-y-5"
	>
		{#if task}
			<input type="hidden" name="taskId" value={task.id} />
		{/if}

		<div>
			<label for="task-title" class="mb-1.5 block text-sm font-medium text-slate-700">
				Judul task
			</label>
			<input
				id="task-title"
				name="title"
				type="text"
				required
				maxlength="200"
				bind:value={title}
				placeholder="Apa yang perlu dikerjakan?"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="task-description" class="mb-1.5 block text-sm font-medium text-slate-700">
				Deskripsi <span class="font-normal text-slate-400">(opsional)</span>
			</label>
			<textarea
				id="task-description"
				name="description"
				rows="4"
				maxlength="2000"
				bind:value={description}
				placeholder="Detail tambahan, link referensi, atau acceptance criteria..."
				class="w-full resize-none rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			></textarea>
		</div>

		<div>
			<span class="mb-1.5 block text-sm font-medium text-slate-700">Platform / Format</span>
			<p class="mb-2 text-xs text-slate-400">
				Pilih satu atau beberapa. Contoh: IG untuk feed Instagram, A4 untuk cetak.
			</p>

			<div class="flex flex-wrap gap-2">
				{#each formatOptions as format (format)}
					{@const active = selectedFormats.some(
						(selected) => selected.toLowerCase() === format.toLowerCase()
					)}
					<button
						type="button"
						aria-pressed={active}
						onclick={() => toggleFormat(format)}
						class={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
							active
								? 'border-indigo-600 bg-indigo-600 text-white'
								: 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
						}`}
					>
						{format}
					</button>
				{/each}
			</div>

			{#if customFormats.length}
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each customFormats as format (format)}
						<span
							class="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
						>
							{format}
							<button
								type="button"
								onclick={() => toggleFormat(format)}
								class="rounded p-0.5 hover:bg-indigo-100"
								aria-label={`Hapus format ${format}`}
							>
								<Icon name="x" size={11} />
							</button>
						</span>
					{/each}
				</div>
			{/if}

			<div class="mt-2 flex gap-2">
				<input
					type="text"
					bind:value={customFormat}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addCustomFormat();
						}
					}}
					maxlength="30"
					placeholder="Format lain, mis. 1080x1080"
					class="min-w-0 flex-1 rounded-xl border-slate-300 px-3 py-2 text-xs shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				/>
				<button
					type="button"
					onclick={addCustomFormat}
					class="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
				>
					Tambah
				</button>
			</div>

			<input type="hidden" name="formats" value={selectedFormats.join(',')} />
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label for="task-column" class="mb-1.5 block text-sm font-medium text-slate-700">
					Status
				</label>
				<select
					id="task-column"
					name="columnId"
					required
					bind:value={columnId}
					class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					{#each columns as column (column.id)}
						<option value={column.id}>{column.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="task-priority" class="mb-1.5 block text-sm font-medium text-slate-700">
					Prioritas
				</label>
				<select
					id="task-priority"
					name="priority"
					bind:value={priority}
					class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					<option value="low">Rendah</option>
					<option value="medium">Sedang</option>
					<option value="high">Tinggi</option>
					<option value="urgent">Urgent</option>
				</select>
			</div>

			<div>
				<span class="mb-1.5 block text-sm font-medium text-slate-700">
					Assignee <span class="font-normal text-slate-400">(bisa lebih dari satu)</span>
				</span>
				<div
					class="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm"
				>
					{#each members as member (member.id)}
						{@const active = selectedAssigneeIds.includes(member.id)}
						<button
							type="button"
							aria-pressed={active}
							onclick={() => toggleAssignee(member.id)}
							class={`inline-flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1 text-xs font-medium transition ${
								active
									? 'border-indigo-600 bg-indigo-600 text-white'
									: 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
							}`}
						>
							<Avatar name={member.name} size="xs" />
							{member.name}
							{#if active}
								<Icon name="check" size={12} />
							{/if}
						</button>
					{:else}
						<p class="px-1 py-1 text-xs text-slate-400">Belum ada anggota project.</p>
					{/each}
				</div>
				<input type="hidden" name="assigneeIds" value={selectedAssigneeIds.join(',')} />
			</div>

			<div>
				<label for="task-due" class="mb-1.5 block text-sm font-medium text-slate-700">
					Tenggat
				</label>
				<input
					id="task-due"
					name="dueDate"
					type="date"
					bind:value={dueDate}
					class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				/>
			</div>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (open = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={submitting}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if submitting}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Menyimpan...
				{:else}
					<Icon name="check" size={16} />
					{isEdit ? 'Simpan perubahan' : 'Buat task'}
				{/if}
			</button>
		</div>
	</form>

	{#if task}
		<form
			method="POST"
			action="?/deleteTask"
			use:confirmAction={{
				title: 'Hapus task?',
				message: `Task "${task.title}" akan dihapus permanen.`,
				confirmLabel: 'Hapus task'
			}}
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						open = false;
						toasts.success('Task dihapus.');
					} else if (result.type === 'failure') {
						toasts.error('Gagal menghapus task.');
					}
				};
			}}
			class="mt-4 border-t border-slate-100 pt-4"
		>
			<input type="hidden" name="taskId" value={task.id} />
			<button
				type="submit"
				class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 transition hover:text-rose-700"
			>
				<Icon name="trash" size={14} />
				Hapus task ini
			</button>
		</form>
	{/if}
</Modal>
