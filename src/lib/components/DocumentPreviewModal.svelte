<script lang="ts">
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';

	type Props = {
		open?: boolean;
		name?: string;
		src?: string;
		downloadHref?: string;
	};

	let {
		open = $bindable(false),
		name = 'Preview dokumen',
		src = '',
		downloadHref = ''
	}: Props = $props();

	function openInNewTab() {
		if (src) window.open(src, '_blank', 'noopener,noreferrer');
	}

	function download() {
		if (downloadHref) window.location.assign(downloadHref);
	}
</script>

<Modal bind:open title={name} size="xl">
	{#if src}
		<iframe
			{src}
			title={name}
			class="h-[65vh] w-full rounded-xl border border-slate-200 bg-slate-50"
		></iframe>

		<div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={openInNewTab}
				class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				<Icon name="external" size={15} />
				Buka di tab baru
			</button>
			<button
				type="button"
				onclick={download}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
			>
				<Icon name="download" size={15} />
				Unduh
			</button>
		</div>
	{/if}
</Modal>
