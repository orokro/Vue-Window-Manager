/*
	WindowFrame.ts
	--------------

	A rectangle of screen real estate that holds windows.

	The important thing about frames is what they DON'T have: a parent. There is no
	layout tree here. Each frame independently stores its four edges as fractions of
	the container (`preferredPos`), and every relationship between frames - who is
	adjacent to whom, what can merge with what, which edges move together during a
	resize - is re-derived geometrically by EdgeMap on each layout pass.

	That's the Blender model rather than the nested-splitter model, and it's why
	merging is a two-line operation (expand my rect over yours, delete you) instead of
	tree surgery.
*/

import { signal, reactive, type Signal } from './signal';
import { clamp01, rangeOverlap, RANGE_OVERLAP } from './utils';
import {
	EDGE,
	EDGE_NEIGHBOR_STATUS,
	FRAME_STYLE,
	SPLIT_MODE,
	type Edge,
	type EdgeNeighborStatus,
	type EdgeRect,
	type FrameDimensions,
	type FrameStyle,
	type PartialEdgeRect,
	type SplitMode,
} from './types';
import type { Window } from './Window';
import type { WindowManager } from './WindowManager';


export interface WindowFrameOptions {
	frameStyle?: FrameStyle;
	allowIconifying?: boolean;
}


export interface RemoveWindowOptions {

	/** Skip the manager's orphaned-window cull (used mid-drag). */
	noCull?: boolean;

	/** Never auto-merge this frame away, even if it just lost its last window. */
	noMerge?: boolean;
}


export class WindowFrame<TComponent = unknown> {

	/** Source of unique frame IDs. */
	static IDCounter = 0;

	// re-exported for callers that already have a frame in hand
	static readonly STYLE = FRAME_STYLE;
	static readonly SPLIT_MODE = SPLIT_MODE;
	static readonly EDGE = EDGE;
	static readonly EDGE_NEIGHBOR_STATUS = EDGE_NEIGHBOR_STATUS;

	readonly frameID: string;
	readonly mgr: WindowManager<TComponent>;

	readonly frameStyle: Signal<FrameStyle>;
	readonly allowIconifying: Signal<boolean>;
	readonly splitMode: Signal<SplitMode>;

	/** Windows in this frame. Plain array; `windowsRef` is the reactive mirror. */
	windows: Window<TComponent>[] = [];
	readonly windowsRef: Signal<ReadonlyArray<Window<TComponent>>>;

	/** windowID of the visible tab, when TABBED. */
	readonly currentTab: Signal<string | null>;

	/** windowID of the focused floating window, when MWI. */
	readonly focusedWindowID: Signal<string | null>;

	/** Current pixel rect. Replaced (not mutated) so the signal fires. */
	readonly screenPos: Signal<EdgeRect>;

	/** How each edge relates to its neighbours. Recomputed every layout pass. */
	readonly neighborStatus: Record<Edge, EdgeNeighborStatus>;

	/** The exactly-adjacent neighbour on each edge, if there is one. */
	neighbors: Record<Edge, WindowFrame<TComponent> | null> = {
		t: null, b: null, l: null, r: null,
	};

	/**
	 * Edges as fractions (0..1) of the container.
	 *
	 * This is the real source of truth for layout - `screenPos` is derived from it on
	 * every fit. Kept as a plain mutable object because it's written on every pointer
	 * move during a resize drag; nothing renders from it directly.
	 */
	preferredPos: EdgeRect = { t: 0, b: 0, l: 0, r: 0 };

	/** Pan offset for the MWI desktop. */
	readonly mwiDragX: Signal<number>;
	readonly mwiDragY: Signal<number>;


	/**
	 * @param mgr - the manager that owns this frame
	 * @param options - initial style options
	 */
	constructor(mgr: WindowManager<TComponent>, options: WindowFrameOptions = {}) {

		this.frameID = `frame_${WindowFrame.IDCounter++}`;
		this.mgr = mgr;

		this.frameStyle = signal<FrameStyle>(options.frameStyle ?? FRAME_STYLE.TABBED);
		this.allowIconifying = signal(options.allowIconifying ?? false);
		this.splitMode = signal<SplitMode>(SPLIT_MODE.OFF);

		this.windowsRef = signal<ReadonlyArray<Window<TComponent>>>([]);
		this.currentTab = signal<string | null>(null);
		this.focusedWindowID = signal<string | null>(null);

		this.screenPos = signal<EdgeRect>({ t: 50, b: 100, l: 70, r: 140 });

		this.neighborStatus = reactive<Record<Edge, EdgeNeighborStatus>>({
			t: EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			b: EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			l: EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			r: EDGE_NEIGHBOR_STATUS.UNDETERMINED,
		});

		this.mwiDragX = signal(0);
		this.mwiDragY = signal(0);
	}


	/**
	 * This frame's rect in the friendlier top/left/width/height form.
	 *
	 * Note the 2px nudge on `top`: it carries over from the Vue version, where it
	 * accounts for the frame's top border so content doesn't sit under it. Validity
	 * checks use this same rect, so changing it changes what layouts are legal.
	 */
	getFrameDim(): FrameDimensions {

		const pos = this.screenPos.value;

		const width = pos.r - pos.l;
		const height = pos.b - pos.t;

		return {
			top: pos.t + 2,
			bottom: pos.b,
			left: pos.l,
			right: pos.r,
			width,
			height,
		};
	}


	/**
	 * Updates some or all of this frame's pixel edges.
	 *
	 * @param values - the edges to change; omitted edges keep their current value
	 */
	updateFramePos(values: PartialEdgeRect): void {

		const current = this.screenPos.peek();

		this.screenPos.value = {
			t: values.t ?? current.t,
			b: values.b ?? current.b,
			l: values.l ?? current.l,
			r: values.r ?? current.r,
		};
	}


	/**
	 * Records this frame's edges as fractions of the container.
	 *
	 * Doing this on resize is what stops frames drifting as the window changes size -
	 * each frame reclaims the same proportion it had before.
	 *
	 * @param containerWidth - width to measure against
	 * @param containerHeight - height to measure against
	 */
	cachePreferredPercentages(containerWidth: number, containerHeight: number): void {

		const pos = this.screenPos.peek();

		this.preferredPos = {
			t: clamp01(pos.t / containerHeight),
			b: clamp01(pos.b / containerHeight),
			l: clamp01(pos.l / containerWidth),
			r: clamp01(pos.r / containerWidth),
		};
	}


	/**
	 * Recomputes pixel edges from the stored fractions.
	 *
	 * Edges are snapped to the grid so that two frames sharing a boundary land on
	 * exactly the same pixel - the edge map keys off exact equality, so this snapping
	 * is what makes adjacency detection work at all. Edges pinned at the container
	 * boundary (fraction of 1) are left unsnapped so they stay flush.
	 *
	 * @param containerWidth - the space available
	 * @param containerHeight - the space available
	 */
	autoUpdateFramePos(containerWidth: number, containerHeight: number): void {

		const snap = this.mgr.snapSize;

		const raw: EdgeRect = {
			t: this.preferredPos.t * containerHeight,
			b: this.preferredPos.b * containerHeight,
			l: this.preferredPos.l * containerWidth,
			r: this.preferredPos.r * containerWidth,
		};

		const snapEdge = (value: number, fraction: number): number =>
			(fraction < 1) ? Math.round(value - (value % snap)) : Math.round(value);

		this.updateFramePos({
			t: snapEdge(raw.t, this.preferredPos.t),
			b: snapEdge(raw.b, this.preferredPos.b),
			l: snapEdge(raw.l, this.preferredPos.l),
			r: snapEdge(raw.r, this.preferredPos.r),
		});
	}


	/**
	 * Recomputes the neighbour status of all four edges.
	 *
	 * @param width - container width at the time of the fit
	 * @param height - container height at the time of the fit
	 */
	updateNeighbors(width: number, height: number): void {

		this.updateNeighborsOnEdge(EDGE.LEFT, width, height);
		this.updateNeighborsOnEdge(EDGE.RIGHT, width, height);
		this.updateNeighborsOnEdge(EDGE.TOP, width, height);
		this.updateNeighborsOnEdge(EDGE.BOTTOM, width, height);
	}


	/**
	 * Works out how a single edge relates to whatever is on the other side of it.
	 *
	 * @param edge - the edge to classify
	 * @param width - container width
	 * @param height - container height
	 */
	updateNeighborsOnEdge(edge: Edge, width: number, height: number): void {

		// assume nothing until we find a perfect partner
		this.neighbors[edge] = null;

		const edgeIsHorizontal = (edge === EDGE.TOP || edge === EDGE.BOTTOM);
		const pos = this.screenPos.peek();
		const edgePos = pos[edge];

		// flush against the container? then there's nothing to be adjacent to
		const atFarSide = edgeIsHorizontal ? (edgePos >= height) : (edgePos >= width);
		if (edgePos <= 0 || atFarSide) {
			this.neighborStatus[edge] = EDGE_NEIGHBOR_STATUS.EXTREMITY;
			return;
		}

		// default assumption for a non-extremity edge
		this.neighborStatus[edge] = EDGE_NEIGHBOR_STATUS.PARTIAL;

		// horizontal edges (top/bottom) live in the vertical-position map, and vice versa
		const posMap = edgeIsHorizontal ? this.mgr.edgeMap.vMap : this.mgr.edgeMap.hMap;
		const sharing = (posMap.get(edgePos) ?? []).filter(i => i.frame.frameID !== this.frameID);

		// the span we compare against runs perpendicular to the edge in question
		const spanLo = edgeIsHorizontal ? EDGE.LEFT : EDGE.TOP;
		const spanHi = edgeIsHorizontal ? EDGE.RIGHT : EDGE.BOTTOM;

		const a = pos[spanLo];
		const b = pos[spanHi];

		for (const candidate of sharing) {

			const otherPos = candidate.frame.screenPos.peek();

			// an exact span match means exactly one neighbour, and it's mergeable
			if (rangeOverlap(a, b, otherPos[spanLo], otherPos[spanHi]) === RANGE_OVERLAP.EXACT_MATCH) {
				this.neighborStatus[edge] = EDGE_NEIGHBOR_STATUS.ADJACENT;
				this.neighbors[edge] = candidate.frame as WindowFrame<TComponent>;
				return;
			}
		}
	}


	/**
	 * Adds a window to this frame, taking ownership of it.
	 *
	 * A SINGLE frame holds one window at a time, so anything already here is displaced.
	 *
	 * @param newWin - the window to add
	 * @param options - `index` to insert at a specific tab position (default: append),
	 *                  `activate` to make it the visible tab (default: true). Layout
	 *                  loading passes activate:false so a multi-window frame opens on
	 *                  its FIRST tab rather than whichever one happened to load last.
	 */
	addWindow(
		newWin: Window<TComponent>,
		options: { index?: number; activate?: boolean } = {},
	): void {

		const activate = options.activate ?? true;

		if (this.frameStyle.peek() === FRAME_STYLE.SINGLE) {

			// whatever we displace is no longer ours
			for (const w of this.windows)
				w.frameRef.value = null;

			this.windows = [];
		}

		// insert at a position, or append
		const next = this.windows.filter(w => w !== newWin);
		const at = (options.index !== undefined)
			? Math.max(0, Math.min(options.index, next.length))
			: next.length;

		next.splice(at, 0, newWin);

		this.windows = next;
		this.windowsRef.value = this.windows;

		newWin.frameRef.value = this;

		if (activate || this.currentTab.peek() === null)
			this.currentTab.value = newWin.windowID;
	}


	/**
	 * Moves a window this frame already holds to a different tab position.
	 *
	 * Tab order IS `this.windows` order - there's no separate ordering model to keep in
	 * step, which is what lets a drag-reorder survive re-renders and serialisation for
	 * free.
	 *
	 * @param win - a window already in this frame
	 * @param index - where it should end up
	 * @returns true if the order actually changed
	 */
	reorderWindow(win: Window<TComponent>, index: number): boolean {

		const from = this.windows.indexOf(win);
		if (from < 0)
			return false;

		const without = this.windows.filter(w => w !== win);
		const to = Math.max(0, Math.min(index, without.length));

		if (to === from)
			return false;

		without.splice(to, 0, win);

		this.windows = without;
		this.windowsRef.value = this.windows;

		return true;
	}


	/**
	 * The window a user would consider "current" here.
	 *
	 * @returns the active window, or null if the frame is empty
	 */
	getActiveWindow(): Window<TComponent> | null {

		if (this.windows.length <= 0)
			return null;

		if (this.frameStyle.peek() === FRAME_STYLE.TABBED) {
			const tab = this.currentTab.peek();
			const active = this.windows.find(w => w.windowID === tab);
			if (active !== undefined)
				return active;
		}

		return this.windows[0];
	}


	/**
	 * Raises a window to the top of the MWI stack and records it as focused.
	 *
	 * @param win - the window to focus
	 */
	focusWindow(win: Window<TComponent> | null): void {

		if (win === null)
			return;

		// lift it clear, then re-normalise the whole stack so z stays bounded
		win.position.z = Number.MAX_SAFE_INTEGER;

		const ordered = [...this.windows].sort((a, b) => (a.position.z ?? 0) - (b.position.z ?? 0));
		for (let i = 0; i < ordered.length; i++)
			ordered[i].position.z = i * 30;

		this.focusedWindowID.value = win.windowID;
	}


	/**
	 * Removes a window from this frame.
	 *
	 * If that empties a non-MWI frame, the frame collapses: an adjacent neighbour is
	 * expanded over it, so the layout never grows holes. `keepEmptyFrames` on the
	 * manager (or `noMerge` here) opts out.
	 *
	 * @param window - the window, or its ID
	 * @param options - cull / merge behaviour
	 */
	removeWindow(window: Window<TComponent> | string, options: RemoveWindowOptions = {}): void {

		const noCull = options.noCull ?? false;
		let noMerge = options.noMerge ?? false;

		// resolve an ID to the real thing
		let target: Window<TComponent> | undefined;

		if (typeof window === 'string') {
			target = this.windows.find(w => w.windowID === window);
			if (target === undefined) {
				console.error(`[win-mgr] tried to remove window "${window}" which is not in ${this.frameID}`);
				return;
			}
		} else {
			target = window;
		}

		this.windows = this.windows.filter(w => w !== target);
		this.windowsRef.value = this.windows;

		// clear the back-pointer, unless it's already been re-parented elsewhere
		if (target.frameRef.peek() === this)
			target.frameRef.value = null;

		if (this.currentTab.peek() === target.windowID)
			this.currentTab.value = this.windows[0]?.windowID ?? null;

		if (this.mgr.keepEmptyFrames.peek())
			noMerge = true;

		if (!noMerge && this.frameStyle.peek() !== FRAME_STYLE.MWI && this.windows.length <= 0)
			this.collapseIntoNeighbor();

		if (!noCull)
			this.mgr.cullOrphanedWindows();
	}


	/** Closes every window in this frame. */
	closeAllWindows(): void {

		for (const win of [...this.windows])
			win.close();

		this.windows = [];
		this.windowsRef.value = this.windows;
		this.currentTab.value = null;
	}


	/**
	 * Returns the edge facing the given one.
	 *
	 * @param edge - an edge
	 */
	static getOppositeEdge(edge: Edge): Edge {
		return ({
			t: EDGE.BOTTOM,
			b: EDGE.TOP,
			l: EDGE.RIGHT,
			r: EDGE.LEFT,
		} as const)[edge];
	}


	/**
	 * Collapses this (now empty) frame by letting a neighbour expand over it.
	 *
	 * Edges are tried right, bottom, left, top - the same order as the original, which
	 * biases collapse towards pulling content leftward/upward.
	 */
	collapseIntoNeighbor(): void {

		const order: ReadonlyArray<{ check: Edge; opposite: Edge }> = [
			{ check: EDGE.RIGHT, opposite: EDGE.LEFT },
			{ check: EDGE.BOTTOM, opposite: EDGE.TOP },
			{ check: EDGE.LEFT, opposite: EDGE.RIGHT },
			{ check: EDGE.TOP, opposite: EDGE.BOTTOM },
		];

		for (const { check, opposite } of order) {

			if (this.neighborStatus[check] !== EDGE_NEIGHBOR_STATUS.ADJACENT)
				continue;

			const neighbor = this.neighbors[check];
			if (neighbor === null)
				continue;

			this.mgr.mergeWindowFrames(neighbor, opposite);
			return;
		}
	}
}
