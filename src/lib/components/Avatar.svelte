<script lang="ts">
	import { initials } from '#lib/utils.ts';

	type Props = {
		name: string;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		className?: string;
	};

	let { name, size = 'md', className = '' }: Props = $props();

	const palettes = [
		'bg-indigo-100 text-indigo-700',
		'bg-emerald-100 text-emerald-700',
		'bg-amber-100 text-amber-700',
		'bg-rose-100 text-rose-700',
		'bg-sky-100 text-sky-700',
		'bg-violet-100 text-violet-700',
		'bg-teal-100 text-teal-700',
		'bg-orange-100 text-orange-700'
	];

	const sizes = {
		xs: 'size-6 text-[10px]',
		sm: 'size-8 text-xs',
		md: 'size-10 text-sm',
		lg: 'size-12 text-base'
	};

	const palette = $derived(
		palettes[
			[...name].reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length
		]
	);
</script>

<span
	class={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${palette} ${sizes[size]} ${className}`}
	title={name}
>
	{initials(name)}
</span>
