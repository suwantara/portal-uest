<script lang="ts">
	import { page } from '$app/state';
	import ErrorState from '#lib/components/ErrorState.svelte';
</script>

<svelte:head>
	<title>{page.status} · Portal UEST</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center py-10">
	<div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
		<ErrorState />
	</div>
</div>
