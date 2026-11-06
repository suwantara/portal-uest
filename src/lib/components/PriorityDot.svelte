<script lang="ts">
	type Priority = 'low' | 'medium' | 'high' | 'urgent';

	type Props = {
		priority: Priority;
		label?: boolean;
	};

	let { priority, label = false }: Props = $props();

	const config: Record<Priority, { text: string; dot: string; classes: string }> = {
		low: { text: 'Rendah', dot: 'bg-slate-400', classes: 'text-slate-500' },
		medium: { text: 'Sedang', dot: 'bg-sky-500', classes: 'text-sky-600' },
		high: { text: 'Tinggi', dot: 'bg-amber-500', classes: 'text-amber-600' },
		urgent: { text: 'Urgent', dot: 'bg-rose-500', classes: 'text-rose-600' }
	};

	const item = $derived(config[priority] ?? config.medium);
</script>

<span class={`inline-flex items-center gap-1.5 text-xs font-medium ${item.classes}`}>
	<span class={`size-1.5 rounded-full ${item.dot}`}></span>
	{#if label}{item.text}{/if}
</span>
