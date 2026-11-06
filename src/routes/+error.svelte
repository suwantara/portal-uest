<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Icon from '#lib/components/Icon.svelte';
</script>

<svelte:head>
	<title>{page.status} · Portal UEST</title>
</svelte:head>

<div
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-50 px-4 py-12"
>
	<div class="relative w-full max-w-lg">
		<a
			href={resolve('/')}
			class="mb-8 inline-flex items-center gap-2.5 text-sm font-semibold text-slate-900"
		>
			<span class="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
				<Icon name="layers" size={19} />
			</span>
			Portal UEST
		</a>

		<div
			class="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10"
		>
			<ErrorState />
		</div>
	</div>
</div>
