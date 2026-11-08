<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import { confirmAction } from '#lib/confirm.svelte.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PasswordInput from '#lib/components/PasswordInput.svelte';
	import { toasts } from '#lib/toast.svelte.ts';
	import { formatDate } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Member = (typeof data.members)[number];

	let memberOpen = $state(false);
	let memberName = $state('');
	let memberEmail = $state('');
	let memberRole = $state<'member' | 'admin'>('member');
	let memberSubmitting = $state(false);

	let resetOpen = $state(false);
	let resetTarget = $state<Member | null>(null);
	let resetPassword = $state('');
	let resetConfirm = $state('');
	let resetSubmitting = $state(false);

	function openMemberModal() {
		memberName = '';
		memberEmail = '';
		memberRole = 'member';
		memberOpen = true;
	}

	function openResetModal(member: Member) {
		resetTarget = member;
		resetPassword = '';
		resetConfirm = '';
		resetOpen = true;
	}

	const roleLabel: Record<string, string> = {
		owner: 'Owner',
		admin: 'Admin',
		member: 'Member'
	};

	const canManage = $derived(data.role === 'owner' || data.role === 'admin');
	const isOwner = $derived(data.role === 'owner');

	async function copyInvite() {
		try {
			await navigator.clipboard.writeText(data.registerUrl);
			toasts.success('Tautan pendaftaran disalin.');
		} catch {
			toasts.error('Tidak dapat menyalin. Salin manual dari alamat halaman register.');
		}
	}
</script>

<svelte:head>
	<title>Tim · Portal UEST</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-slate-900">Tim</h1>
			<p class="mt-1 text-sm text-slate-500">
				{data.members.length} anggota di workspace {data.workspace.name}.
			</p>
		</div>

		{#if canManage}
			<button
				type="button"
				onclick={openMemberModal}
				class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
			>
				<Icon name="plus" size={16} />
				Tambah anggota
			</button>
		{/if}
	</header>

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
			<div class="flex items-start gap-3">
				<span
					class={`flex size-10 items-center justify-center rounded-xl ${
						data.registrationEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
					}`}
				>
					<Icon name={data.registrationEnabled ? 'mail' : 'shield'} size={18} />
				</span>
				<div class="min-w-0">
					<h2 class="text-sm font-semibold text-slate-900">
						{data.registrationEnabled ? 'Undang anggota baru' : 'Pendaftaran publik ditutup'}
					</h2>
					<p class="mt-1 text-xs text-slate-400">
						{data.registrationEnabled
							? 'Bagikan tautan pendaftaran. Anggota baru otomatis bergabung sebagai member.'
							: 'Gunakan tombol Tambah anggota untuk membuat akun. Setelah itu, tambahkan mereka ke project melalui tab Anggota pada project.'}
					</p>

					{#if data.registrationEnabled}
						<div class="mt-3 flex flex-col gap-2 sm:flex-row">
							<input
								type="text"
								readonly
								value={data.registerUrl}
								class="min-w-0 flex-1 rounded-xl border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500"
							/>
							<button
								type="button"
								onclick={copyInvite}
								class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
							>
								<Icon name="link" size={14} />
								Salin tautan
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-medium text-slate-400">Total anggota</p>
			<p class="mt-1 text-3xl font-semibold text-slate-900">{data.members.length}</p>
			<p class="mt-2 text-xs text-slate-400">
				{data.members.filter((member) => member.role === 'admin' || member.role === 'owner').length}
				owner/admin
			</p>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
			<h2 class="text-sm font-semibold text-slate-900">Anggota workspace</h2>
			<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
				{data.members.length} orang
			</span>
		</div>

		<div class="divide-y divide-slate-100">
			{#each data.members as member, index (member.id)}
				<div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<Avatar name={member.name} />
						<div class="min-w-0">
							<p class="flex items-center gap-2 truncate text-sm font-medium text-slate-800">
								{member.name}
								{#if member.id === data.currentUserId}
									<span
										class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
									>
										Anda
									</span>
								{/if}
							</p>
							<p class="truncate text-xs text-slate-400">{member.email}</p>
						</div>
					</div>

					<div class="flex items-center gap-4 sm:w-48">
						<span class="text-xs text-slate-400">
							{member.openTasks} task aktif
						</span>
						<span class="text-xs text-slate-300">·</span>
						<span class="text-xs text-slate-400">Gabung {formatDate(member.joinedAt)}</span>
					</div>

					<div class="flex items-center gap-2 sm:w-52 sm:justify-end">
						{#if canManage && member.role !== 'owner' && member.id !== data.currentUserId}
							<form
								method="POST"
								action="?/updateRole"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										if (result.type === 'success') toasts.success('Role diperbarui.');
										else if (result.type === 'failure') {
											toasts.error(
												typeof result.data?.error === 'string'
													? result.data.error
													: 'Gagal memperbarui role.'
											);
										}
									};
								}}
							>
								<input type="hidden" name="userId" value={member.id} />
								<select
									name="role"
									value={member.role}
									onchange={(event) => event.currentTarget.form?.requestSubmit()}
									class="rounded-lg border-slate-300 py-1.5 pr-8 pl-2.5 text-xs font-medium text-slate-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
								>
									<option value="member">Member</option>
									<option value="admin">Admin</option>
								</select>
							</form>
						{:else}
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
						{/if}

						{#if isOwner && member.role !== 'owner' && member.id !== data.currentUserId}
							<details class="relative">
								<summary
									class="flex cursor-pointer list-none items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
									aria-label={`Aksi untuk ${member.name}`}
								>
									<Icon name="more" size={16} />
								</summary>
								<div
									class={`absolute right-0 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${
										index === data.members.length - 1 ? 'bottom-full mb-1' : 'top-full mt-1'
									}`}
								>
									<button
										type="button"
										onclick={() => openResetModal(member)}
										class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
									>
										<Icon name="key" size={14} />
										Reset password
									</button>

									<form
										method="POST"
										action="?/deleteMember"
										use:confirmAction={{
											title: 'Hapus akun anggota?',
											message: `Akun ${member.name} (${member.email}) akan dihapus permanen. Task yang di-assign kepadanya menjadi unassigned.`,
											confirmLabel: 'Hapus akun'
										}}
										use:enhance={() => {
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') toasts.success('Akun anggota dihapus.');
												else if (result.type === 'failure') {
													toasts.error(
														typeof result.data?.error === 'string'
															? result.data.error
															: 'Gagal menghapus akun anggota.'
													);
												}
											};
										}}
									>
										<input type="hidden" name="userId" value={member.id} />
										<button
											type="submit"
											class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
										>
											<Icon name="trash" size={14} />
											Hapus akun
										</button>
									</form>
								</div>
							</details>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<Modal
	bind:open={memberOpen}
	title="Tambah anggota"
	description="Buat akun langsung untuk anggota tim. Bagikan email dan password awal kepada mereka."
>
	<form
		method="POST"
		action="?/createMember"
		use:enhance={() => {
			memberSubmitting = true;
			return async ({ result, update }) => {
				await update();
				memberSubmitting = false;

				if (result.type === 'success') {
					memberOpen = false;
					memberName = '';
					memberEmail = '';
					memberRole = 'member';
					toasts.success('Anggota baru berhasil dibuat.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string' ? result.data.error : 'Gagal membuat anggota.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		<div>
			<label for="member-name" class="mb-1.5 block text-sm font-medium text-slate-700">
				Nama lengkap
			</label>
			<input
				id="member-name"
				name="name"
				type="text"
				required
				maxlength="80"
				bind:value={memberName}
				placeholder="Nama anggota"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<div>
			<label for="member-email" class="mb-1.5 block text-sm font-medium text-slate-700">
				Email
			</label>
			<input
				id="member-email"
				name="email"
				type="email"
				required
				bind:value={memberEmail}
				placeholder="nama@perusahaan.com"
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			/>
		</div>

		<PasswordInput
			id="member-password"
			name="password"
			label="Password awal"
			placeholder="Min. 8 karakter"
			autocomplete="new-password"
			minlength={8}
		/>

		<div>
			<label for="member-role" class="mb-1.5 block text-sm font-medium text-slate-700">
				Role
			</label>
			<select
				id="member-role"
				name="role"
				bind:value={memberRole}
				class="w-full rounded-xl border-slate-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
			>
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
			<p class="mt-1.5 text-xs text-slate-400">
				Member dapat mengelola task, dokumen, dan link. Admin juga dapat mengelola project dan
				anggota.
			</p>
		</div>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (memberOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={memberSubmitting}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if memberSubmitting}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Menyimpan...
				{:else}
					<Icon name="plus" size={16} />
					Buat anggota
				{/if}
			</button>
		</div>
	</form>
</Modal>

<Modal
	bind:open={resetOpen}
	title="Reset password anggota"
	description={resetTarget
		? `Password baru untuk ${resetTarget.name} (${resetTarget.email}). Semua sesi lama akan dikeluarkan.`
		: ''}
>
	<form
		method="POST"
		action="?/resetPassword"
		use:enhance={() => {
			resetSubmitting = true;
			return async ({ result, update }) => {
				await update();
				resetSubmitting = false;

				if (result.type === 'success') {
					resetOpen = false;
					resetPassword = '';
					resetConfirm = '';
					toasts.success('Password anggota berhasil direset.');
				} else if (result.type === 'failure') {
					toasts.error(
						typeof result.data?.error === 'string'
							? result.data.error
							: 'Gagal mereset password anggota.'
					);
				}
			};
		}}
		class="space-y-5"
	>
		{#if resetTarget}
			<input type="hidden" name="userId" value={resetTarget.id} />
		{/if}

		<PasswordInput
			id="reset-password"
			name="newPassword"
			label="Password baru"
			placeholder="Min. 8 karakter"
			autocomplete="new-password"
			minlength={8}
			bind:value={resetPassword}
		/>
		<PasswordInput
			id="reset-confirm-password"
			name="confirmPassword"
			label="Ulangi password baru"
			placeholder="Ulangi password"
			autocomplete="new-password"
			minlength={8}
			bind:value={resetConfirm}
		/>

		<div class="flex justify-end gap-2 border-t border-slate-100 pt-4">
			<button
				type="button"
				onclick={() => (resetOpen = false)}
				class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
			>
				Batal
			</button>
			<button
				type="submit"
				disabled={resetSubmitting}
				class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#if resetSubmitting}
					<span class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
					></span>
					Menyimpan...
				{:else}
					<Icon name="key" size={16} />
					Reset password
				{/if}
			</button>
		</div>
	</form>
</Modal>
