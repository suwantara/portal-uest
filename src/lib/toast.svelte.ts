export type ToastType = 'success' | 'error';

type Toast = {
	id: number;
	message: string;
	type: ToastType;
};

class ToastStore {
	items = $state<Toast[]>([]);
	private nextId = 0;

	show(message: string, type: ToastType = 'success') {
		const id = ++this.nextId;
		this.items.push({ id, message, type });

		setTimeout(() => this.dismiss(id), 4000);
	}

	success(message: string) {
		this.show(message, 'success');
	}

	error(message: string) {
		this.show(message, 'error');
	}

	dismiss(id: number) {
		this.items = this.items.filter((toast) => toast.id !== id);
	}
}

export const toasts = new ToastStore();
