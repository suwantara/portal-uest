<script lang="ts">
	import { asset } from '$app/paths';
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="alternate icon" href={asset('favicon.ico')} sizes="16x16 32x32 48x48" />
	<link rel="apple-touch-icon" href={asset('apple-touch-icon.png')} sizes="180x180" />
	<meta name="theme-color" content="#4f46e5" />
</svelte:head>

{@render children()}
<Toasts />
<ConfirmDialog />
