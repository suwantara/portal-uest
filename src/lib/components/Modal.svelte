<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		size?: 'md' | 'lg' | 'xl';
		children: Snippet;
	};

	let { open = $bindable(false), title, description, size = 'md', children }: Props = $props();

	let dialog = $state<HTMLDialogElement>();

	const widths = {
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};

	$effect(() => {
		if (!dialog) return;

		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function close() {
		open = false;
	}

	function handleClick(event: MouseEvent) {
		if (event.target === dialog) close();
	}
</script>

<dialog
	bind:this={dialog}
	onclose={close}
	onclick={handleClick}
	class={`m-auto w-[calc(100vw-2rem)] ${widths[size]} rounded-2xl border border-slate-200 bg-white p-0 text-left shadow-2xl`}
	aria-labelledby="modal-title"
>
	<div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
		<div>
			<h2 id="modal-title" class="text-lg font-semibold text-slate-900">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm text-slate-500">{description}</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={close}
			class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
			aria-label="Tutup"
		>
			<Icon name="x" size={18} />
		</button>
	</div>

	<div class="max-h-[75vh] overflow-y-auto px-6 py-5">
		{@render children()}
	</div>
</dialog>

<style>
	dialog::backdrop {
		background: rgb(15 23 42 / 0.55);
		backdrop-filter: blur(3px);
	}

	dialog[open] {
		animation: modal-in 160ms ease-out;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
