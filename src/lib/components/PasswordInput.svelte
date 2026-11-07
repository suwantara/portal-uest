<script lang="ts">
	import Icon from './Icon.svelte';

	type Props = {
		id: string;
		name: string;
		label: string;
		placeholder?: string;
		autocomplete?: 'current-password' | 'new-password';
		minlength?: number;
		value?: string;
	};

	let {
		id,
		name,
		label,
		placeholder = '••••••••',
		autocomplete = 'current-password',
		minlength,
		value = $bindable('')
	}: Props = $props();

	let visible = $state(false);
</script>

<div>
	<label for={id} class="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
	<div class="relative">
		<input
			{id}
			{name}
			type={visible ? 'text' : 'password'}
			required
			{minlength}
			{autocomplete}
			{placeholder}
			bind:value
			class="w-full rounded-xl border-slate-300 bg-white py-2.5 pr-11 pl-3.5 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
		/>
		<button
			type="button"
			onclick={() => (visible = !visible)}
			class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:text-indigo-600"
			aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
			aria-pressed={visible}
			title={visible ? 'Sembunyikan password' : 'Tampilkan password'}
		>
			<Icon name={visible ? 'eye-off' : 'eye'} size={18} />
		</button>
	</div>
</div>
