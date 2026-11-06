<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import DocumentEditModal from '#lib/components/DocumentEditModal.svelte';
	import DocumentPreviewModal from '#lib/components/DocumentPreviewModal.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { formatBytes, formatDateTime } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type DocumentRow = (typeof data.documents)[number];

	let previewOpen = $state(false);
	let previewDoc = $state<DocumentRow | null>(null);
	let editOpen = $state(false);
	let editDoc = $state<DocumentRow | null>(null);

	const totalSize = $derived(data.documents.reduce((total, item) => total + item.size, 0));
	const canManage = $derived(data.role === 'owner' || data.role === 'admin');
	const storageTone = $derived(
		data.storage.percent >= 90
			? 'bg-rose-500'
			: data.storage.percent >= 75
				? 'bg-amber-500'
				: 'bg-indigo-500'
	);

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

	function canModify(doc: DocumentRow): boolean {
		return doc.uploadedBy === data.currentUserId || canManage;
	}

	function downloadHref(doc: DocumentRow): string {
		return resolve('/(app)/projects/[id]/documents/[docId]/download', {
			id: doc.projectId,
			docId: doc.id
		});
	}

	function previewHref(doc: DocumentRow): string {
		return resolve('/(app)/projects/[id]/documents/[docId]/download?preview=1', {
			id: doc.projectId,
			docId: doc.id
		});
	}

	function openPreview(doc: DocumentRow) {
		previewDoc = doc;
		previewOpen = true;
	}

	function openEdit(doc: DocumentRow) {
		editDoc = doc;
		editOpen = true;
	}
</script>

<svelte:head>
	<title>Dokumen · Portal UEST</title>
</svelte:head>

<div class="space-y-5">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-slate-900">Dokumen</h1>
			<p class="mt-1 text-sm text-slate-500">
				Semua dokumen workspace dari {data.projectCount} project.
			</p>
		</div>

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
	</header>

	<section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h2 class="text-sm font-semibold text-slate-900">Kuota penyimpanan</h2>
				<p class="mt-0.5 text-xs text-slate-400">
					Batas dokumen 8 GB, menyisakan ambang aman dari kuota R2 10 GB.
				</p>
			</div>
			<p class="text-xs font-medium text-slate-500">
				{formatBytes(data.storage.used)} / {formatBytes(data.storage.limit)}
			</p>
		</div>
		<div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
			<div
				class={`h-full rounded-full transition-all ${storageTone}`}
				style={`width: ${Math.min(100, data.storage.percent)}%`}
			></div>
		</div>
		<p class="mt-2 text-xs text-slate-400">
			{formatBytes(data.storage.remaining)} tersisa · {Math.round(data.storage.percent)}% terpakai
		</p>
	</section>

	{#if data.documents.length}
		<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
			<div
				class="hidden grid-cols-[1fr_160px_150px_140px_150px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase sm:grid"
			>
				<span>Nama file</span>
				<span>Project</span>
				<span>Diunggah oleh</span>
				<span>Tanggal</span>
				<span class="text-right">Aksi</span>
			</div>

			<div class="divide-y divide-slate-100">
				{#each data.documents as doc (doc.id)}
					<div
						class="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_160px_150px_140px_150px] sm:items-center sm:gap-4 sm:px-5"
					>
						<div class="flex min-w-0 items-center gap-3">
							<span
								class={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneFor(doc.mimeType)}`}
							>
								<Icon name="file" size={18} />
							</span>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-slate-800">{doc.name}</p>
								<p class="truncate text-xs text-slate-400">
									{formatBytes(doc.size)} · {doc.mimeType}
								</p>
							</div>
						</div>

						<div class="flex items-center gap-2 text-xs text-slate-500">
							<span
								class="size-2 shrink-0 rounded-full"
								style={`background-color: ${doc.projectColor}`}
							></span>
							<span class="truncate">{doc.projectName}</span>
						</div>

						<div class="text-xs text-slate-400">
							<span class="sm:hidden">Oleh: </span>{doc.uploaderName ?? 'Tidak diketahui'}
						</div>

						<div class="text-xs text-slate-400">{formatDateTime(doc.createdAt)}</div>

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
									id: doc.projectId,
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
									onsubmit={(event) => {
										if (!confirm(`Hapus dokumen "${doc.name}"?`)) event.preventDefault();
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
									<input type="hidden" name="projectId" value={doc.projectId} />
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

		<p class="text-xs text-slate-400">
			Semua anggota workspace dapat melihat dan mengunduh dokumen. Hanya pengunggah atau owner/admin
			yang dapat mengedit dan menghapus.
		</p>
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
				Dokumen diunggah dari halaman masing-masing project, lalu muncul di sini untuk seluruh
				anggota workspace.
			</p>
			<a
				href={resolve('/(app)/projects')}
				class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
			>
				<Icon name="folder" size={16} />
				Buka projects
			</a>
		</div>
	{/if}
</div>

<DocumentPreviewModal
	bind:open={previewOpen}
	name={previewDoc?.name ?? 'Preview dokumen'}
	src={previewDoc ? previewHref(previewDoc) : ''}
	downloadHref={previewDoc ? downloadHref(previewDoc) : ''}
/>

<DocumentEditModal
	bind:open={editOpen}
	document={editDoc}
	projectId={editDoc?.projectId ?? ''}
	action="?/updateDocument"
/>
