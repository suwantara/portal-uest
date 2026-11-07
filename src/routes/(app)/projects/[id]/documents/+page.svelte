<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import DocumentEditModal from '#lib/components/DocumentEditModal.svelte';
	import DocumentPreviewModal from '#lib/components/DocumentPreviewModal.svelte';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { formatBytes, formatDateTime } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let uploadOpen = $state(false);
	let selectedFiles = $state<File[]>([]);
	let fileInput = $state<HTMLInputElement>();
	let submitting = $state(false);

	let previewOpen = $state(false);
	let previewDoc = $state<(typeof data.documents)[number] | null>(null);
	let editOpen = $state(false);
	let editDoc = $state<(typeof data.documents)[number] | null>(null);

	const totalSize = $derived(data.documents.reduce((total, item) => total + item.size, 0));
	const canManage = $derived(data.role === 'owner' || data.role === 'admin');

	function canModify(doc: (typeof data.documents)[number]): boolean {
		return doc.uploadedBy === data.currentUserId || canManage;
	}

	function downloadHref(doc: (typeof data.documents)[number]): string {
		return resolve('/(app)/projects/[id]/documents/[docId]/download', {
			id: data.projectId,
			docId: doc.id
		});
	}

	function previewHref(doc: (typeof data.documents)[number]): string {
		return resolve('/(app)/projects/[id]/documents/[docId]/download?preview=1', {
			id: data.projectId,
			docId: doc.id
		});
	}

	function openPreview(doc: (typeof data.documents)[number]) {
		previewDoc = doc;
		previewOpen = true;
	}

	function openEdit(doc: (typeof data.documents)[number]) {
		editDoc = doc;
		editOpen = true;
	}

	const typeTone: Record<string, string> = {
		image: 'bg-emerald-50 text-emerald-600',
		pdf: 'bg-rose-50 text-rose-600',
		spreadsheet: 'bg-teal-50 text-teal-600',
		document: 'bg-indigo-50 text-indigo-600'
	};

	function toneFor(mime: string): string {
		if (mime.startsWith('image/')) return typeTone.image;
		if (mime === 'application/pdf') return typeTone.pdf;
		if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
			return typeTone.spreadsheet;
		}
		return typeTone.document;
	}

	function pickFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		selectedFiles = Array.from(input.files ?? []);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const files = event.dataTransfer?.files;
		if (!files?.length || !fileInput) return;
		fileInput.files = files;
		selectedFiles = Array.from(files);
	}
</script>

<svelte:head>
	<title>Dokumen · Portal UEST</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-2 text-xs text-slate-400">
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200"
			>
				<Icon name="file" size={13} />
				{data.documents.length} file
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm ring-1 ring-slate-200"
			>
				<Icon name="layers" size={13} />
				{formatBytes(totalSize)}
			</span>
		</div>

		<button
			type="button"
			onclick={() => (uploadOpen = true)}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			<Icon name="upload" size={16} />
			Upload dokumen
		</button>
	</div>

	{#if data.documents.length}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div
				class="hidden grid-cols-[1fr_110px_160px_140px_140px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase sm:grid"
			>
				<span>Nama file</span>
				<span>Ukuran</span>
				<span>Diunggah oleh</span>
				<span>Tanggal</span>
				<span class="text-right">Aksi</span>
			</div>

			<div class="divide-y divide-slate-100">
				{#each data.documents as doc (doc.id)}
					<div
						class="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_110px_160px_140px_140px] sm:items-center sm:gap-4 sm:px-5"
					>
						<div class="flex min-w-0 items-center gap-3">
							<span
								class={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneFor(doc.mimeType)}`}
							>
								<Icon name="file" size={18} />
							</span>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-slate-800">{doc.name}</p>
								<p class="truncate text-xs text-slate-400">{doc.mimeType}</p>
							</div>
						</div>

						<div class="text-xs text-slate-400 sm:text-sm sm:text-slate-500">
							<span class="sm:hidden">Ukuran: </span>{formatBytes(doc.size)}
						</div>

						<div class="text-xs text-slate-400 sm:text-sm sm:text-slate-500">
							<span class="sm:hidden">Oleh: </span>{doc.uploaderName ?? 'Tidak diketahui'}
						</div>

						<div class="text-xs text-slate-400 sm:text-sm sm:text-slate-500">
							{formatDateTime(doc.createdAt)}
						</div>

						<div class="flex items-center gap-1 sm:justify-end">
							{#if doc.mimeType === 'application/pdf'}
								<button
									type="button"
									onclick={() => openPreview(doc)}
									class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
									title="Preview PDF"
									aria-label={`Preview ${doc.name}`}
								>
									<Icon name="eye" size={16} />
								</button>
							{/if}

							<a
								href={resolve('/(app)/projects/[id]/documents/[docId]/download', {
									id: data.projectId,
									docId: doc.id
								})}
								class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
								title="Unduh"
								aria-label={`Unduh ${doc.name}`}
							>
								<Icon name="download" size={16} />
							</a>

							{#if canModify(doc)}
								<button
									type="button"
									onclick={() => openEdit(doc)}
									class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
									title="Edit nama dokumen"
									aria-label={`Edit ${doc.name}`}
								>
									<Icon name="edit" size={16} />
								</button>

								<form
									method="POST"
									action="?/deleteDocument"
									use:confirmAction={{
										title: 'Hapus dokumen?',
										message: `Dokumen "${doc.name}" akan dihapus permanen dari penyimpanan.`,
										confirmLabel: 'Hapus dokumen'
									}}
									use:enhance={() => {
										return async ({ result, update }) => {
											await update();
											if (result.type === 'success') toasts.success('Dokumen dihapus.');
											else if (result.type === 'failure') {
												toasts.error(
													typeof result.data?.error === 'string'
														? result.data.error
														: 'Gagal menghapus dokumen.'
												);
											}
										};
									}}
								>
									<input type="hidden" name="documentId" value={doc.id} />
									<button
										type="submit"
										class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
										title="Hapus"
										aria-label={`Hapus ${doc.name}`}
									>
										<Icon name="trash" size={16} />
									</button>
								</form>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center"
		>
			<span
				class="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"
			>
				<Icon name="file" size={26} />
			</span>
			<h2 class="mt-4 text-base font-semibold text-slate-800">Belum ada dokumen</h2>
			<p class="mt-1 max-w-sm text-sm text-slate-400">
				Unggah brief, desain, laporan, atau file pendukung lain untuk tim.
			</p>
			<button
				type="button"
				onclick={() => (uploadOpen = true)}
				class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
			>
				<Icon name="upload" size={16} />
				Upload file pertama
			</button>
		</div>
	{/if}
</div>

<Modal
	bind:open={uploadOpen}
	title="Upload dokumen"
	description="Maksimal 5 file sekaligus, 10 MB per file. Upload video tidak diizinkan."
>
	<form
		method="POST"
		action="?/uploadDocuments"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') {
					uploadOpen = false;
					selectedFiles = [];
					toasts.success('Dokumen berhasil diunggah.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string' ? result.data.error : 'Gagal mengunggah file.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		<label
			ondragover={(event) => event.preventDefault()}
			ondrop={handleDrop}
			class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
		>
			<span
				class="flex size-12 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm"
			>
				<Icon name="upload" size={22} />
			</span>
			<span class="mt-3 text-sm font-semibold text-slate-700">
				Klik untuk memilih file atau tarik ke sini
			</span>
			<span class="mt-1 text-xs text-slate-400">
				PDF, gambar, dokumen, spreadsheet. Upload video tidak diizinkan.
			</span>
			<input
				bind:this={fileInput}
				type="file"
				name="files"
				multiple
				onchange={pickFiles}
				class="sr-only"
			/>
		</label>

		{#if selectedFiles.length}
			<div class="space-y-2">
				{#each selectedFiles as file (file.name + file.size)}
					<div class="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
						<span
							class="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"
						>
							<Icon name="file" size={15} />
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-xs font-medium text-slate-700">{file.name}</p>
							<p class="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
						</div>
						<Icon name="check-circle" size={16} className="text-emerald-500" />
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => {
					uploadOpen = false;
					selectedFiles = [];
				}}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={submitting || !selectedFiles.length}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if submitting}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Mengunggah...
				{:else}
					<Icon name="upload" size={16} />
					Upload {selectedFiles.length ? `(${selectedFiles.length})` : ''}
				{/if}
			</button>
		</div>
	</form>
</Modal>

<DocumentPreviewModal
	bind:open={previewOpen}
	name={previewDoc?.name ?? 'Preview dokumen'}
	src={previewDoc ? previewHref(previewDoc) : ''}
	downloadHref={previewDoc ? downloadHref(previewDoc) : ''}
/>

<DocumentEditModal bind:open={editOpen} document={editDoc} action="?/updateDocument" />
