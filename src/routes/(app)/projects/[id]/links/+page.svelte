<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { formatDate } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Link = (typeof data.links)[number];

	let linkOpen = $state(false);
	let editing = $state<Link | null>(null);
	let title = $state('');
	let url = $state('');
	let description = $state('');
	let tags = $state('');
	let submitting = $state(false);

	$effect(() => {
		if (!linkOpen) return;
		title = editing?.title ?? '';
		url = editing?.url ?? '';
		description = editing?.description ?? '';
		tags = editing?.tags.join(', ') ?? '';
		submitting = false;
	});

	function openCreate() {
		editing = null;
		linkOpen = true;
	}

	function openEdit(link: Link) {
		editing = link;
		linkOpen = true;
	}

	function domain(value: string): string {
		try {
			return new URL(value).hostname.replace(/^www\./, '');
		} catch {
			return value;
		}
	}
</script>

<svelte:head>
	<title>Link · Portal UEST</title>
</svelte:head>

<div class="space-y-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<p
			class="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-400 shadow-sm ring-1 ring-slate-200"
		>
			<Icon name="link" size={13} />
			{data.links.length} link tersimpan
		</p>

		<button
			type="button"
			onclick={openCreate}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			<Icon name="plus" size={16} />
			Tambah link
		</button>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.links as link (link.id)}
			<article
				class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
			>
				<div class="flex items-start justify-between gap-3">
					<a
						href={link.url}
						target="_blank"
						rel="external noopener noreferrer"
						class="flex min-w-0 items-center gap-3"
					>
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
						>
							<Icon name="link" size={18} />
						</span>
						<span class="min-w-0">
							<span class="block truncate text-sm font-semibold text-slate-900">
								{link.title}
							</span>
							<span class="block truncate text-xs text-slate-400">{domain(link.url)}</span>
						</span>
					</a>

					<div class="flex shrink-0 items-center gap-0.5">
						<button
							type="button"
							onclick={() => openEdit(link)}
							class="rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-slate-100 hover:text-indigo-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
							aria-label={`Edit ${link.title}`}
						>
							<Icon name="edit" size={14} />
						</button>
						<form
							method="POST"
							action="?/deleteLink"
							use:confirmAction={{
								title: 'Hapus link?',
								message: `Link "${link.title}" akan dihapus dari project ini.`,
								confirmLabel: 'Hapus link'
							}}
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') toasts.success('Link dihapus.');
									else if (result.type === 'failure') toasts.error('Gagal menghapus link.');
								};
							}}
						>
							<input type="hidden" name="linkId" value={link.id} />
							<button
								type="submit"
								class="rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
								aria-label={`Hapus ${link.title}`}
							>
								<Icon name="trash" size={14} />
							</button>
						</form>
					</div>
				</div>

				<p class="mt-3 line-clamp-3 min-h-10 flex-1 text-xs leading-relaxed text-slate-500">
					{link.description || 'Tanpa deskripsi.'}
				</p>

				{#if link.tags.length}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each link.tags as tag (tag)}
							<span
								class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
							>
								#{tag}
							</span>
						{/each}
					</div>
				{/if}

				<div
					class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400"
				>
					<span>{link.creatorName ?? 'Tidak diketahui'}</span>
					<span>{formatDate(link.createdAt)}</span>
				</div>
			</article>
		{:else}
			<div
				class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center"
			>
				<span
					class="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"
				>
					<Icon name="link" size={26} />
				</span>
				<h2 class="mt-4 text-base font-semibold text-slate-800">Belum ada link</h2>
				<p class="mt-1 max-w-sm text-sm text-slate-400">
					Simpan referensi, dokumen online, atau tautan penting agar mudah ditemukan tim.
				</p>
				<button
					type="button"
					onclick={openCreate}
					class="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
				>
					<Icon name="plus" size={16} />
					Tambah link pertama
				</button>
			</div>
		{/each}
	</div>
</div>

<Modal
	bind:open={linkOpen}
	title={editing ? 'Edit link' : 'Link baru'}
	description="Simpan tautan penting beserta konteksnya untuk tim."
>
	<form
		method="POST"
		action={editing ? '?/updateLink' : '?/createLink'}
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				await update();
				submitting = false;
				if (result.type === 'success') {
					linkOpen = false;
					toasts.success(editing ? 'Link diperbarui.' : 'Link ditambahkan.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string' ? result.data.error : 'Gagal menyimpan link.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		{#if editing}
			<input type="hidden" name="linkId" value={editing.id} />
		{/if}

		<div>
			<label for="link-title" class="mb-1.5 block text-sm font-medium text-slate-700">Judul</label>
			<input
				id="link-title"
				name="title"
				type="text"
				required
				maxlength="160"
				bind:value={title}
				placeholder="Contoh: Design system tim"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="link-url" class="mb-1.5 block text-sm font-medium text-slate-700">URL</label>
			<input
				id="link-url"
				name="url"
				type="text"
				required
				bind:value={url}
				placeholder="https://..."
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="link-description" class="mb-1.5 block text-sm font-medium text-slate-700">
				Deskripsi <span class="font-normal text-slate-400">(opsional)</span>
			</label>
			<textarea
				id="link-description"
				name="description"
				rows="3"
				maxlength="500"
				bind:value={description}
				placeholder="Kenapa link ini penting?"
				class="w-full resize-none rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			></textarea>
		</div>

		<div>
			<label for="link-tags" class="mb-1.5 block text-sm font-medium text-slate-700">
				Tag <span class="font-normal text-slate-400">(pisahkan dengan koma)</span>
			</label>
			<input
				id="link-tags"
				name="tags"
				type="text"
				bind:value={tags}
				placeholder="design, referensi, figma"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (linkOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={submitting}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
			>
				{#if submitting}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Menyimpan...
				{:else}
					<Icon name="check" size={16} />
					{editing ? 'Simpan' : 'Tambah link'}
				{/if}
			</button>
		</div>
	</form>
</Modal>
