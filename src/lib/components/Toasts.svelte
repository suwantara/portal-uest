<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toasts } from '#lib/toast.svelte.ts';
	import Icon from './Icon.svelte';
</script>

<div class="pointer-events-none fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2">
	{#each toasts.items as toast (toast.id)}
		<div
			transition:fly={{ y: 12, duration: 180 }}
			class={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
				toast.type === 'success'
					? 'border-emerald-200 bg-white text-emerald-800'
					: 'border-rose-200 bg-white text-rose-800'
			}`}
			role="status"
		>
			<Icon
				name={toast.type === 'success' ? 'check-circle' : 'alert'}
				size={18}
				className={toast.type === 'success' ? 'mt-0.5 text-emerald-500' : 'mt-0.5 text-rose-500'}
			/>
			<p class="flex-1 text-sm font-medium">{toast.message}</p>
			<button
				type="button"
				class="rounded p-0.5 text-slate-400 hover:text-slate-700"
				onclick={() => toasts.dismiss(toast.id)}
				aria-label="Tutup notifikasi"
			>
				<Icon name="x" size={14} />
			</button>
		</div>
	{/each}
</div>
