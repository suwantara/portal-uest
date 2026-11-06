<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';

	type DocumentInfo = {
		id: string;
		name: string;
	};

	type Props = {
		open?: boolean;
		document?: DocumentInfo | null;
		action?: string;
		projectId?: string;
	};

	let {
		open = $bindable(false),
		document: documentInfo = null,
		action = '?/updateDocument',
		projectId = ''
	}: Props = $props();

	let name = $state('');

	$effect(() => {
		if (open) name = documentInfo?.name ?? '';
	});
</script>

<Modal bind:open title="Edit dokumen" description="Ubah nama tampilan dokumen.">
	<form
		method="POST"
		{action}
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();

				if (result.type === 'success') {
					open = false;
					toasts.success('Dokumen diperbarui.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string'
							? result.data.error
							: 'Gagal memperbarui dokumen.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		{#if documentInfo}
			<input type="hidden" name="documentId" value={documentInfo.id} />
		{/if}
		{#if projectId}
			<input type="hidden" name="projectId" value={projectId} />
		{/if}

		<div>
			<label for="document-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama dokumen
			</label>
			<input
				id="document-name"
				name="name"
				type="text"
				required
				maxlength="180"
				bind:value={name}
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
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
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
			>
				<Icon name="check" size={16} />
				Simpan
			</button>
		</div>
	</form>
</Modal>
