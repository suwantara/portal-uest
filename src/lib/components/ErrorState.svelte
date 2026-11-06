<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	const state = $derived.by(() => {
		switch (page.status) {
			case 401:
				return {
					icon: 'user',
					label: 'Sesi berakhir',
					title: 'Anda perlu masuk kembali',
					message:
						'Sesi Anda sudah berakhir atau belum terautentikasi. Silakan masuk untuk melanjutkan.',
					tone: 'bg-sky-50 text-sky-600'
				};
			case 403:
				return {
					icon: 'shield',
					label: 'Akses ditolak',
					title: 'Anda tidak memiliki izin',
					message:
						'Akun Anda tidak memiliki akses ke halaman atau data ini. Hubungi owner/admin workspace jika menurut Anda ini keliru.',
					tone: 'bg-amber-50 text-amber-600'
				};
			case 404:
				return {
					icon: 'search',
					label: 'Halaman tidak ditemukan',
					title: 'Halaman ini tidak tersedia',
					message:
						'Alamat yang Anda buka mungkin salah, sudah dipindahkan, atau datanya sudah dihapus.',
					tone: 'bg-indigo-50 text-indigo-600'
				};
			case 500:
				return {
					icon: 'alert',
					label: 'Terjadi kesalahan',
					title: 'Ada masalah di server',
					message:
						'Permintaan Anda tidak dapat diproses saat ini. Coba beberapa saat lagi atau hubungi admin.',
					tone: 'bg-rose-50 text-rose-600'
				};
			default:
				return {
					icon: 'alert',
					label: `Error ${page.status}`,
					title: 'Permintaan tidak dapat diproses',
					message:
						'Terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke dashboard.',
					tone: 'bg-slate-100 text-slate-600'
				};
		}
	});
</script>

<div class="flex flex-col items-center text-center">
	<span class={`flex size-16 items-center justify-center rounded-2xl ${state.tone}`}>
		<Icon name={state.icon} size={28} />
	</span>

	<p class="mt-6 text-[11px] font-semibold tracking-[0.24em] text-indigo-500 uppercase">
		{state.label}
	</p>
	<p class="mt-1 text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">{page.status}</p>
	<h1 class="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
		{state.title}
	</h1>
	<p class="mt-3 max-w-md text-sm leading-relaxed text-slate-500">{state.message}</p>

	<div class="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
		<a
			href={resolve('/(app)/dashboard')}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
		>
			<Icon name="dashboard" size={16} />
			Ke dashboard
		</a>
		<button
			type="button"
			onclick={() => history.back()}
			class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
		>
			<Icon name="chevron-left" size={16} />
			Kembali
		</button>
	</div>

	<p class="mt-8 text-xs text-slate-400">Portal UEST · Workspace internal tim</p>
</div>
