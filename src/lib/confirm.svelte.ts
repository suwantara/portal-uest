export type ConfirmTone = 'danger' | 'primary';

export type ConfirmOptions = {
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: ConfirmTone;
};

type ConfirmState = Required<ConfirmOptions> & {
	open: boolean;
};

class ConfirmStore {
	state = $state<ConfirmState>({
		open: false,
		title: '',
		message: '',
		confirmLabel: 'Hapus',
		cancelLabel: 'Batal',
		tone: 'danger'
	});

	resolveFn: ((value: boolean) => void) | null = null;

	ask(options: ConfirmOptions): Promise<boolean> {
		this.resolveFn?.(false);

		return new Promise((resolve) => {
			this.resolveFn = resolve;
			this.state = {
				open: true,
				title: options.title,
				message: options.message,
				confirmLabel: options.confirmLabel ?? 'Hapus',
				cancelLabel: options.cancelLabel ?? 'Batal',
				tone: options.tone ?? 'danger'
			};
		});
	}

	resolve(value: boolean) {
		const resolver = this.resolveFn;
		this.resolveFn = null;
		this.state = { ...this.state, open: false };
		resolver?.(value);
	}
}

export const confirmDialog = new ConfirmStore();

/**
 * Svelte action for forms: intercepts submit-button clicks, asks for
 * confirmation, then re-submits the form so `use:enhance` can handle it.
 */
export function confirmAction(node: HTMLFormElement, options: ConfirmOptions) {
	let current = options;

	function handleClick(event: MouseEvent) {
		if (!(event.target instanceof Element)) return;

		const submitter = event.target.closest('button[type="submit"], input[type="submit"]') as
			HTMLButtonElement | HTMLInputElement | null;

		if (!submitter || !node.contains(submitter)) return;

		event.preventDefault();

		void confirmDialog.ask(current).then((confirmed) => {
			if (confirmed) node.requestSubmit(submitter);
		});
	}

	node.addEventListener('click', handleClick);

	return {
		update(next: ConfirmOptions) {
			current = next;
		},
		destroy() {
			node.removeEventListener('click', handleClick);
		}
	};
}
