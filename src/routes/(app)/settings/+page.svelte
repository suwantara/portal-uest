<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let editNameOpen = $state(false);
	let profileName = $state('');
	let savingName = $state(false);

	function openEditName() {
		profileName = data.user.name;
		editNameOpen = true;
	}

	const roleLabel: Record<string, string> = {
		owner: 'Owner',
		admin: 'Admin',
		member: 'Member'
	};
</script>

<svelte:head>
	<title>Pengaturan akun · Portal UEST</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-2xl font-semibold tracking-tight text-slate-900">Pengaturan akun</h1>
		<p class="mt-1 text-sm text-slate-500">Kelola informasi akun dan keamanan password Anda.</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
		<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="flex items-center gap-4">
					<Avatar name={data.user.name} size="lg" />
					<div class="min-w-0">
						<h2 class="truncate text-base font-semibold text-slate-900">{data.user.name}</h2>
						<p class="truncate text-sm text-slate-400">{data.user.email}</p>
					</div>
				</div>

				<button
					type="button"
					onclick={openEditName}
					class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
				>
					<Icon name="edit" size={13} />
					Edit nama
				</button>
			</div>

			<dl class="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
				<div class="flex items-center justify-between gap-3">
					<dt class="text-slate-400">Workspace</dt>
					<dd class="font-medium text-slate-700">{data.workspace.name}</dd>
				</div>
				<div class="flex items-center justify-between gap-3">
					<dt class="text-slate-400">Role</dt>
					<dd>
						<span
							class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
								data.role === 'owner'
									? 'bg-amber-50 text-amber-700'
									: data.role === 'admin'
										? 'bg-indigo-50 text-indigo-700'
										: 'bg-slate-100 text-slate-600'
							}`}
						>
							{roleLabel[data.role] ?? data.role}
						</span>
					</dd>
				</div>
			</dl>

			<div class="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
				Email akun tidak dapat diubah sendiri. Hubungi owner/admin workspace jika perlu penyesuaian.
			</div>
		</section>

		<section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-start gap-3">
				<span
					class="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
				>
					<Icon name="shield" size={19} />
				</span>
				<div>
					<h2 class="text-base font-semibold text-slate-900">Ganti password</h2>
					<p class="mt-1 text-sm text-slate-400">
						Masukkan password saat ini, lalu tentukan password baru.
					</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/changePassword"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						await update();
						submitting = false;

						if (result.type === 'success') {
							toasts.success('Password berhasil diubah.');
						} else if (result.type === 'failure') {
							toasts.error(
								typeof result.data?.error === 'string'
									? result.data.error
									: 'Gagal mengubah password.'
							);
						}
					};
				}}
				class="mt-6 space-y-4"
			>
				{#if form?.error}
					<div
						class="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
					>
						<Icon name="alert" size={17} className="mt-0.5 shrink-0" />
						<p>{form.error}</p>
					</div>
				{/if}

				<PasswordInput
					id="currentPassword"
					name="currentPassword"
					label="Password saat ini"
					autocomplete="current-password"
				/>

				<div class="grid gap-4 sm:grid-cols-2">
					<PasswordInput
						id="newPassword"
						name="newPassword"
						label="Password baru"
						placeholder="Min. 8 karakter"
						autocomplete="new-password"
						minlength={8}
					/>
					<PasswordInput
						id="confirmPassword"
						name="confirmPassword"
						label="Ulangi password baru"
						placeholder="Ulangi password"
						autocomplete="new-password"
						minlength={8}
					/>
				</div>

				<label class="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
					<input
						type="checkbox"
						name="revokeOtherSessions"
						checked
						class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
					/>
					<span>
						<span class="block text-sm font-medium text-slate-700">
							Keluarkan sesi di perangkat lain
						</span>
						<span class="mt-0.5 block text-xs text-slate-400">
							Sesi Anda saat ini tetap aktif. Sangat disarankan jika password pernah dibagikan.
						</span>
					</span>
				</label>

				<div class="flex justify-end border-t border-slate-100 pt-4">
					<button
						type="submit"
						disabled={submitting}
						class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if submitting}
							<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
							></span>
							Menyimpan...
						{:else}
							<Icon name="check" size={16} />
							Simpan password baru
						{/if}
					</button>
				</div>
			</form>
		</section>
	</div>
</div>

<Modal
	bind:open={editNameOpen}
	title="Edit nama"
	description="Nama ini tampil di sidebar, aktivitas task, dan daftar anggota."
>
	<form
		method="POST"
		action="?/updateProfile"
		use:enhance={() => {
			savingName = true;
			return async ({ result, update }) => {
				await update();
				savingName = false;

				if (result.type === 'success') {
					editNameOpen = false;
					toasts.success('Nama akun diperbarui.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string'
							? result.data.error
							: 'Gagal memperbarui nama akun.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		<div>
			<label for="profile-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama lengkap
			</label>
			<input
				id="profile-name"
				name="name"
				type="text"
				required
				maxlength="80"
				bind:value={profileName}
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (editNameOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={savingName}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if savingName}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Menyimpan...
				{:else}
					<Icon name="check" size={16} />
					Simpan nama
				{/if}
			</button>
		</div>
	</form>
</Modal>
