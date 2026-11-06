<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { formatDate } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const roleLabel: Record<string, string> = {
		owner: 'Owner',
		admin: 'Admin',
		member: 'Member'
	};

	const canManage = $derived(data.role === 'owner' || data.role === 'admin');
</script>

<svelte:head>
	<title>Anggota project · Portal UEST</title>
</svelte:head>

<div class="space-y-5">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 class="text-lg font-semibold tracking-tight text-slate-900">Anggota project</h2>
			<p class="mt-1 max-w-2xl text-sm text-slate-500">
				Hanya anggota project ini yang dapat melihat project dan di-assign task. Anggota baru
				ditambahkan oleh owner/admin.
			</p>
		</div>
		<span
			class="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-400 shadow-sm ring-1 ring-slate-200"
		>
			<Icon name="users" size={13} />
			{data.members.length} anggota
		</span>
	</header>

	{#if canManage}
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<h3 class="text-sm font-semibold text-slate-900">Tambah anggota ke project</h3>
			<p class="mt-1 text-xs text-slate-400">
				Pilih anggota workspace yang belum tergabung. Untuk membuat akun baru, buka halaman Tim.
			</p>

			{#if data.available.length}
				<form
					method="POST"
					action="?/addMember"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') toasts.success('Anggota ditambahkan ke project.');
							else if (result.type === 'failure') {
								toasts.error(
									typeof result.data?.error === 'string'
										? result.data.error
										: 'Gagal menambahkan anggota.'
								);
							}
						};
					}}
					class="mt-4 flex flex-col gap-2 sm:flex-row"
				>
					<select
						name="userId"
						required
						class="min-w-0 flex-1 rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
					>
						<option value="">Pilih anggota workspace...</option>
						{#each data.available as member (member.id)}
							<option value={member.id}>{member.name} — {member.email}</option>
						{/each}
					</select>
					<button
						type="submit"
						class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
					>
						<Icon name="plus" size={16} />
						Tambahkan
					</button>
				</form>
			{:else}
				<p
					class="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400"
				>
					Semua anggota workspace sudah tergabung di project ini. Buat akun baru lewat halaman
					<a
						href={resolve('/(app)/team')}
						class="font-semibold text-indigo-600 hover:text-indigo-700">Tim</a
					>.
				</p>
			{/if}
		</div>
	{/if}

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
			<h3 class="text-sm font-semibold text-slate-900">Daftar anggota</h3>
			<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
				{data.members.length} orang
			</span>
		</div>

		<div class="divide-y divide-slate-100">
			{#each data.members as member (member.id)}
				<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<Avatar name={member.name} />
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-slate-800">{member.name}</p>
							<p class="truncate text-xs text-slate-400">{member.email}</p>
						</div>
					</div>

					<div class="flex items-center gap-3 text-xs text-slate-400 sm:w-52">
						<span>Bergabung {formatDate(member.addedAt)}</span>
						<span
							class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
								member.role === 'owner'
									? 'bg-amber-50 text-amber-700'
									: member.role === 'admin'
										? 'bg-indigo-50 text-indigo-700'
										: 'bg-slate-100 text-slate-600'
							}`}
						>
							{roleLabel[member.role] ?? member.role}
						</span>
					</div>

					{#if canManage}
						<form
							method="POST"
							action="?/removeMember"
							onsubmit={(event) => {
								if (
									!confirm(
										`Keluarkan ${member.name} dari project ini? Task yang di-assign kepadanya akan menjadi unassigned.`
									)
								) {
									event.preventDefault();
								}
							}}
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success')
										toasts.success('Anggota dikeluarkan dari project.');
									else if (result.type === 'failure') {
										toasts.error(
											typeof result.data?.error === 'string'
												? result.data.error
												: 'Gagal mengeluarkan anggota.'
										);
									}
								};
							}}
							class="sm:text-right"
						>
							<input type="hidden" name="userId" value={member.id} />
							<button
								type="submit"
								class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
							>
								<Icon name="trash" size={13} />
								Keluarkan
							</button>
						</form>
					{/if}
				</div>
			{:else}
				<div class="px-6 py-12 text-center">
					<p class="text-sm font-medium text-slate-700">Belum ada anggota project</p>
					<p class="mt-1 text-xs text-slate-400">
						Tambahkan anggota workspace agar mereka bisa mengakses project ini.
					</p>
				</div>
			{/each}
		</div>
	</div>
</div>
