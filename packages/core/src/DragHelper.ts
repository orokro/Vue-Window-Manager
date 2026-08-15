/*
	DragHelper.ts
	-------------

	Window-level drag tracking, so a drag that leaves the element it started on (or
	leaves the browser window entirely) keeps working.

	Two deliberate changes from the `gdraghelper` package the Vue version used:

	1. Pointer Events instead of mouse events, with pointer capture. That gets us touch
	   and pen for free, and stops the drag being interrupted by an iframe or a
	   different element swallowing the mouse.

	2. Deltas are conventional: `dx = current - start`. The original returned
	   `start - current`, which is why its callers were littered with `startPos - dx`
	   and `dx *= -1`. Every call site in this port assumes the normal sign.

	Listeners are attached only for the duration of a drag, rather than living on the
	window forever.
*/

/** Callbacks for a drag operation. */
export interface DragHandlers {

	/** Called on every pointer move while dragging. */
	onMove?: (dx: number, dy: number, ev: PointerEvent) => void;

	/** Called once when the drag finishes (pointer up, cancel, or programmatic cancel). */
	onEnd?: (dx: number, dy: number, ev: PointerEvent | null) => void;
}


/** Handle to an in-flight drag, so it can be cancelled early. */
export interface DragToken {
	readonly id: number;
	cancel(): void;
}


export interface Point {
	x: number;
	y: number;
}


export class DragHelper {

	// last known pointer position, in page coordinates
	private _cursor: Point = { x: 0, y: 0 };

	// the drag currently in flight, if any
	private _active: {
		id: number;
		start: Point;
		handlers: DragHandlers;
		element: Element | null;
		pointerId: number | null;
	} | null = null;

	private _nextID = 1;

	// bound once so add/removeEventListener agree
	private readonly _onPointerMoveTrack = (ev: PointerEvent) => {
		this._cursor = { x: ev.pageX, y: ev.pageY };
	};

	private readonly _onPointerMove = (ev: PointerEvent) => this._handleMove(ev);
	private readonly _onPointerUp = (ev: PointerEvent) => this._handleEnd(ev);

	constructor() {

		// track the cursor even when idle - some callers need a position at drag start
		// before any move event has fired
		if (typeof window !== 'undefined')
			window.addEventListener('pointermove', this._onPointerMoveTrack, { passive: true });
	}


	/** Last known pointer position in page coordinates. */
	getCursorPos(): Point {
		return { ...this._cursor };
	}


	/** True while a drag is in flight. */
	get isDragging(): boolean {
		return this._active !== null;
	}


	/**
	 * Begins a drag operation.
	 *
	 * Any drag already in flight is ended first - concurrent drags are not a thing this
	 * system ever wants, and the original's array-of-callbacks pretended otherwise.
	 *
	 * @param handlers - move / end callbacks
	 * @param ev - OPTIONAL; the pointer event that triggered the drag, for an exact
	 *             start position
	 * @param options - OPTIONAL; `capture` (default true) routes all pointer events to
	 *             the element the drag started on. Turn it OFF when the gesture needs
	 *             other elements to keep receiving pointer/mouse events underneath the
	 *             cursor - the corner split gesture relies on the split overlay seeing
	 *             the cursor so it can position the cut.
	 * @returns a token that can cancel the drag
	 */
	dragStart(handlers: DragHandlers, ev?: PointerEvent, options: { capture?: boolean } = {}): DragToken {

		// only one drag at a time
		if (this._active !== null)
			this._handleEnd(null);

		const start = (ev != null)
			? { x: ev.pageX, y: ev.pageY }
			: { ...this._cursor };

		if (ev != null)
			this._cursor = { ...start };

		const id = this._nextID++;
		let element: Element | null = null;
		let pointerId: number | null = null;

		// capture the pointer so we keep getting events even over other elements
		if ((options.capture ?? true) && ev != null && ev.target instanceof Element) {
			element = ev.target;
			pointerId = ev.pointerId;
			try {
				element.setPointerCapture(ev.pointerId);
			} catch {
				// capture is best-effort; window listeners below are the real mechanism
				element = null;
				pointerId = null;
			}
		}

		this._active = { id, start, handlers, element, pointerId };

		window.addEventListener('pointermove', this._onPointerMove);
		window.addEventListener('pointerup', this._onPointerUp);
		window.addEventListener('pointercancel', this._onPointerUp);

		return {
			id,
			cancel: () => {
				if (this._active !== null && this._active.id === id)
					this._handleEnd(null);
			},
		};
	}


	/** Ends any in-flight drag immediately, firing its onEnd. */
	cancel(): void {
		if (this._active !== null)
			this._handleEnd(null);
	}


	/** Removes the idle cursor-tracking listener. Call when tearing the manager down. */
	destroy(): void {

		this.cancel();

		if (typeof window !== 'undefined')
			window.removeEventListener('pointermove', this._onPointerMoveTrack);
	}


	/**
	 * Handles a pointer move during a drag.
	 *
	 * @param ev - the pointer event
	 */
	private _handleMove(ev: PointerEvent): void {

		const active = this._active;
		if (active === null)
			return;

		// ignore a second pointer (e.g. a second finger) once one is driving the drag
		if (active.pointerId !== null && ev.pointerId !== active.pointerId)
			return;

		this._cursor = { x: ev.pageX, y: ev.pageY };

		// stop the browser turning the drag into a text selection
		ev.preventDefault();

		active.handlers.onMove?.(
			ev.pageX - active.start.x,
			ev.pageY - active.start.y,
			ev,
		);
	}


	/**
	 * Finishes a drag and tears down its listeners.
	 *
	 * @param ev - the pointer event that ended it, or null for a programmatic cancel
	 */
	private _handleEnd(ev: PointerEvent | null): void {

		const active = this._active;
		if (active === null)
			return;

		if (ev !== null && active.pointerId !== null && ev.pointerId !== active.pointerId)
			return;

		// clear state BEFORE the callback, so an onEnd that starts a new drag works
		this._active = null;

		window.removeEventListener('pointermove', this._onPointerMove);
		window.removeEventListener('pointerup', this._onPointerUp);
		window.removeEventListener('pointercancel', this._onPointerUp);

		if (active.element !== null && active.pointerId !== null) {
			try {
				active.element.releasePointerCapture(active.pointerId);
			} catch {
				// element may already be gone; nothing to do
			}
		}

		active.handlers.onEnd?.(
			this._cursor.x - active.start.x,
			this._cursor.y - active.start.y,
			ev,
		);
	}
}
