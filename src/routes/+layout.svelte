<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import Toasts from '#lib/components/Toasts.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#4f46e5" />
</svelte:head>

{@render children()}
<Toasts />
