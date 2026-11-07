<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';

	type Priority = 'low' | 'medium' | 'high' | 'urgent';

	type TaskData = {
		id: string;
		title: string;
		description: string | null;
		priority: Priority;
		columnId: string;
		assigneeId: string | null;
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
	let columnId = $state('');
	let assigneeId = $state('');
	let dueDate = $state('');
	let submitting = $state(false);

	const isEdit = $derived(Boolean(task));

	$effect(() => {
		if (!open) return;

		title = task?.title ?? '';
		description = task?.description ?? '';
		priority = task?.priority ?? 'medium';
		columnId = task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '';
		assigneeId = task?.assigneeId ?? '';
		dueDate = task?.dueDate ?? defaultDueDate ?? '';
		submitting = false;
	});
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
				<label for="task-assignee" class="mb-1.5 block text-sm font-medium text-slate-700">
					Assignee
				</label>
				<select
					id="task-assignee"
					name="assigneeId"
					bind:value={assigneeId}
					class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
				>
					<option value="">Belum ditentukan</option>
					{#each members as member (member.id)}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
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
