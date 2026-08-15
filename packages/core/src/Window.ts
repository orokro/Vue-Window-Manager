/*
	Window.ts
	---------

	One open window instance.

	Windows live inside frames, but are tracked separately by the manager because they
	migrate between frames without being destroyed. `frameRef` is the reactive
	back-pointer saying which frame currently holds this window; it is set and cleared
	exclusively by WindowFrame.addWindow / removeWindow.

	`domContainer` is the element the window's content should currently be parented
	into. The core never touches the DOM itself - it only publishes where the content
	*should* be, and the renderer binding makes it so. That indirection is what lets a
	window be re-docked (or picked up by a drag layer) without its component being
	torn down and rebuilt.
*/

import { signal, reactive, type Signal } from './signal';
import type { WindowDescriptor } from './types';
import type { WindowFrame } from './WindowFrame';
import type { WindowManager } from './WindowManager';


export interface WindowPosition {
	x: number | null;
	y: number | null;
	z: number | null;
}

export interface WindowSize {
	width: number;
	height: number;
}


export class Window<TComponent = unknown> {

	/** Source of unique window IDs. */
	static IDCounter = 0;

	readonly windowID: string;
	readonly mgr: WindowManager<TComponent>;

	/** Discriminator so `removeWindow` can sanity-check what it was handed. */
	readonly typeName = 'Window';

	/** Props forwarded to the window's component. */
	props: Record<string, unknown>;

	/** Free position & stacking. Only meaningful inside an MWI frame. */
	readonly position: WindowPosition;

	/** Free size. Only meaningful inside an MWI frame. */
	readonly size: WindowSize;

	/** Where this window's content should currently be parented. */
	readonly domContainer: Signal<HTMLElement | null>;

	/** The frame this window currently lives in, or null while undocked mid-drag. */
	readonly frameRef: Signal<WindowFrame<TComponent> | null>;

	/** Hidden but alive. Only meaningful in an MWI frame with a task bar. */
	readonly minimized: Signal<boolean>;

	/** Position within a tabbed frame's strip. */
	readonly tabOrder: Signal<number>;

	/** The window kind slug. */
	readonly kindRef: Signal<string | null>;

	/** The display title. */
	readonly titleRef: Signal<string>;

	/** Hook returning JSON-safe state to persist alongside the layout. */
	serializeHook: (() => unknown) | null = null;

	/** Hook receiving persisted state back on layout load. */
	loadHook: ((data: unknown) => void) | null = null;

	/** State restored from a layout, pending a component registering `loadHook`. */
	restoreData: unknown = null;


	/**
	 * @param mgr - the manager that spawned this window
	 * @param kind - the window kind slug
	 * @param props - props to hand the component
	 */
	constructor(mgr: WindowManager<TComponent>, kind: string, props: Record<string, unknown> = {}) {

		this.windowID = `window_${Window.IDCounter++}`;
		this.mgr = mgr;
		this.props = props;

		this.position = reactive<WindowPosition>({ x: null, y: null, z: null });
		this.size = reactive<WindowSize>({ width: 640, height: 480 });

		this.domContainer = signal<HTMLElement | null>(null);
		this.frameRef = signal<WindowFrame<TComponent> | null>(null);
		this.minimized = signal(false);
		this.tabOrder = signal(0);

		this.kindRef = signal<string | null>(kind);
		this.titleRef = signal(this._lookupDetails(kind).title);
	}


	/** The window kind slug. */
	get kind(): string | null {
		return this.kindRef.value;
	}

	/** Alias kept for parity with the original API. */
	get windowSlug(): string | null {
		return this.kindRef.value;
	}

	/** The display title. */
	get title(): string {
		return this.titleRef.value;
	}

	/** The registry entry for this window's kind. */
	get windowDetails(): WindowDescriptor<TComponent> {
		return this._lookupDetails(this.kindRef.peek());
	}


	/**
	 * Changes this window to a different kind, resetting its title to the new kind's.
	 *
	 * @param newKind - the slug to switch to
	 */
	setWindowKind(newKind: string): void {

		if (newKind === this.kindRef.peek())
			return;

		this.kindRef.value = newKind;
		this.titleRef.value = this._lookupDetails(newKind).title;
	}


	/**
	 * Sets the window's display title.
	 *
	 * @param title - the new title
	 */
	setTitle(title: string): void {
		this.titleRef.value = title;
	}


	/**
	 * Moves the window. Only meaningful in an MWI frame.
	 *
	 * @param pos - new x and/or y
	 */
	moveWindow(pos: { x?: number; y?: number }): void {

		if (pos.x !== undefined)
			this.position.x = pos.x;

		if (pos.y !== undefined)
			this.position.y = pos.y;
	}


	/**
	 * Resizes the window. Only meaningful in an MWI frame.
	 *
	 * @param size - new width and/or height
	 */
	resizeWindow(size: { width?: number; height?: number }): void {

		if (size.width !== undefined)
			this.size.width = size.width;

		if (size.height !== undefined)
			this.size.height = size.height;
	}


	/**
	 * Closes this window.
	 *
	 * Note this never auto-merges the frame away, even if it was the last window -
	 * closing a window programmatically shouldn't rearrange the user's layout.
	 */
	close(): void {

		const frame = this.frameRef.peek();
		if (frame === null)
			return;

		frame.removeWindow(this, { noMerge: true });
	}


	/** Hides the window while keeping it alive. */
	minimize(): void {
		this.minimized.value = true;
	}


	/** Un-hides the window and focuses it within its frame. */
	restore(): void {

		this.minimized.value = false;

		const frame = this.frameRef.peek();
		if (frame !== null)
			frame.focusWindow(this);
	}


	/**
	 * Resolves a kind slug to its descriptor, falling back to a placeholder rather than
	 * throwing - a layout referencing a kind that isn't registered should render an
	 * obvious empty window, not take the whole app down.
	 *
	 * @param slug - the kind slug
	 */
	private _lookupDetails(slug: string | null): WindowDescriptor<TComponent> {

		const found = (slug !== null)
			? this.mgr.availableWindowList.getWindowBySlug(slug)
			: null;

		if (found !== null)
			return found;

		return {
			window: null as TComponent,
			title: (slug !== null) ? `Unknown: ${slug}` : 'Empty',
			slug: slug ?? '',
			icon: '',
		};
	}
}
