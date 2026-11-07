<script lang="ts">
	import Icon from './Icon.svelte';
	import { confirmDialog } from '#lib/confirm.svelte.ts';

	let dialog = $state<HTMLDialogElement>();

	const dialogState = $derived(confirmDialog.state);
	const tone = $derived(dialogState.tone === 'danger' ? 'danger' : 'primary');
	const icon = $derived(tone === 'danger' ? 'alert' : 'check-circle');

	$effect(() => {
		if (!dialog) return;

		if (dialogState.open && !dialog.open) {
			dialog.showModal();
		} else if (!dialogState.open && dialog.open) {
			dialog.close();
		}
	});

	function handleClick(event: MouseEvent) {
		if (event.target === dialog) confirmDialog.resolve(false);
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => confirmDialog.resolve(false)}
	onclick={handleClick}
	class="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-left shadow-2xl"
	aria-labelledby="confirm-dialog-title"
	aria-describedby="confirm-dialog-description"
>
	<div class="p-6">
		<div class="flex items-start gap-4">
			<span
				class={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
					tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
				}`}
			>
				<Icon name={icon} size={21} />
			</span>

			<div class="min-w-0">
				<h2 id="confirm-dialog-title" class="text-base font-semibold text-slate-900">
					{dialogState.title}
				</h2>
				<p id="confirm-dialog-description" class="mt-1.5 text-sm leading-relaxed text-slate-500">
					{dialogState.message}
				</p>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-2">
			<button
				type="button"
				onclick={() => confirmDialog.resolve(false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				{dialogState.cancelLabel}
			</button>
			<button
				type="button"
				onclick={() => confirmDialog.resolve(true)}
				class={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
					tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
				}`}
			>
				<Icon name={tone === 'danger' ? 'trash' : 'check'} size={15} />
				{dialogState.confirmLabel}
			</button>
		</div>
	</div>
</dialog>

<style>
	dialog::backdrop {
		background: rgb(15 23 42 / 0.55);
		backdrop-filter: blur(3px);
	}

	dialog[open] {
		animation: confirm-in 140ms ease-out;
	}

	@keyframes confirm-in {
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
