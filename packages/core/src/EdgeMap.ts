/*
	EdgeMap.ts
	----------

	Derives the relationships between frames from nothing but their geometry.

	Consider this arrangement:

		┌──────────┬──────────┬──────────┐
		│ Frame 1  │ Frame 2  │ Frame 3  │
		│          │          ├──────────┤
		│          │          │ Frame 4  │
		└──────────┴──────────┴──────────┘

	- 1's right edge and 2's left edge coincide AND span the same rows: exactly
	  adjacent, so they can merge.
	- 2's right edge coincides with 3's and 4's left edges, but matches neither span:
	  partial. Dragging it must move all three together, but nothing can merge.
	- 1, 2 and 3 all share a top edge without being adjacent along it at all.

	Rather than track any of that explicitly, we rebuild two lookup tables on every
	layout pass - x-position to edges, y-position to edges - and let the frames
	interrogate them. The tables key on exact numbers, which is safe only because
	WindowFrame snaps its edges to a grid first.
*/

import { EDGE, type Edge, type EdgeRect } from './types';
import type { WindowFrame } from './WindowFrame';
import type { WindowManager } from './WindowManager';


/** One edge of one frame. */
export interface EdgeEntry<TComponent = unknown> {
	frame: WindowFrame<TComponent>;
	edge: Edge;
}


/** A snapshot of every frame's fractional rect, for rolling back a bad drag. */
export interface PreferredPositionsCache {
	id: string;
	pos: EdgeRect;
}


export class EdgeMap<TComponent = unknown> {

	/** x-position -> left/right edges sitting on it. */
	hMap = new Map<number, EdgeEntry<TComponent>[]>();

	/** y-position -> top/bottom edges sitting on it. */
	vMap = new Map<number, EdgeEntry<TComponent>[]>();

	private readonly mgr: WindowManager<TComponent>;


	/**
	 * @param mgr - the manager whose frames we map
	 */
	constructor(mgr: WindowManager<TComponent>) {
		this.mgr = mgr;
	}


	/** Rebuilds both lookup tables from the current frame positions. */
	rebuildMap(): void {

		this.hMap = new Map();
		this.vMap = new Map();

		const add = (map: Map<number, EdgeEntry<TComponent>[]>, key: number, entry: EdgeEntry<TComponent>) => {
			const bucket = map.get(key);
			if (bucket !== undefined)
				bucket.push(entry);
			else
				map.set(key, [entry]);
		};

		for (const frame of this.mgr.frames) {

			const { t, b, l, r } = frame.screenPos.peek();

			add(this.hMap, l, { frame, edge: EDGE.LEFT });
			add(this.hMap, r, { frame, edge: EDGE.RIGHT });
			add(this.vMap, t, { frame, edge: EDGE.TOP });
			add(this.vMap, b, { frame, edge: EDGE.BOTTOM });
		}
	}


	/**
	 * Normalises a freshly-loaded layout into fractions.
	 *
	 * A layout is authored in whatever coordinate space its author felt like (the
	 * default is a notional 1920x1080). This measures the bounding box of everything
	 * that was loaded, shifts it to the origin, and converts every frame to fractions
	 * of that box - after which the real container size is the only thing that matters.
	 *
	 * Should run exactly once per layout load.
	 */
	computeFrameLayout(): void {

		if (this.mgr.frames.length === 0)
			return;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;

		for (const frame of this.mgr.frames) {
			const { t, b, l, r } = frame.screenPos.peek();
			minX = Math.min(minX, l, r);
			maxX = Math.max(maxX, l, r);
			minY = Math.min(minY, t, b);
			maxY = Math.max(maxY, t, b);
		}

		// guard against a degenerate layout (every frame a zero-width sliver)
		const initialWidth = (maxX - minX) || 1;
		const initialHeight = (maxY - minY) || 1;

		for (const frame of this.mgr.frames) {

			const { t, b, l, r } = frame.screenPos.peek();

			frame.updateFramePos({
				t: t - minY,
				b: b - minY,
				l: l - minX,
				r: r - minX,
			});

			frame.cachePreferredPercentages(initialWidth, initialHeight);
		}

		this.fitWindows();
	}


	/**
	 * Recomputes every frame's pixel rect for the current container size, then
	 * refreshes the edge tables and neighbour statuses.
	 *
	 * @param recomputeLayout - OPTIONAL; re-normalise fractions first (after a load)
	 * @param width - OPTIONAL; container width, measured from the DOM if omitted
	 * @param height - OPTIONAL; container height, measured from the DOM if omitted
	 * @returns the dimensions actually used
	 */
	fitWindows(recomputeLayout = false, width?: number, height?: number): { width: number; height: number } {

		if (recomputeLayout)
			this.computeFrameLayout();

		const measured = this.mgr.getContainerSize();
		const useWidth = width ?? measured.width;

		// leave a sliver at the bottom so the bottom-most grab handles stay grabbable
		const useHeight = (height ?? measured.height) - this.mgr.bottomGutter;

		for (const frame of this.mgr.frames)
			frame.autoUpdateFramePos(useWidth, useHeight);

		this.rebuildMap();
		this.evaluateNeighbors(useWidth, useHeight);

		return { width: useWidth, height: useHeight };
	}


	/**
	 * Checks whether every frame is currently in a legal state.
	 *
	 * There's no constraint solver here: drags apply a change, ask this, and roll back
	 * if the answer is no. Cheap, because the whole check is O(frames).
	 *
	 * @param width - container width to test against
	 * @param height - container height to test against
	 */
	checkValidLayout(width: number, height: number): boolean {

		const min = this.mgr.smallestWidthOrHeight;

		for (const frame of this.mgr.frames) {

			const dim = frame.getFrameDim();

			if (dim.width < min || dim.height < min)
				return false;

			if (dim.right < dim.left || dim.bottom < dim.top)
				return false;

			if (dim.left < 0 || dim.top < 0)
				return false;

			if (dim.right > width || dim.bottom > height)
				return false;
		}

		return true;
	}


	/**
	 * Asks every frame to reclassify its edges.
	 *
	 * @param width - container width
	 * @param height - container height
	 */
	evaluateNeighbors(width: number, height: number): void {

		for (const frame of this.mgr.frames)
			frame.updateNeighbors(width, height);
	}


	/** Snapshots every frame's fractional rect so a bad move can be undone. */
	getPreferredPositionsCache(): PreferredPositionsCache[] {

		return this.mgr.frames.map(frame => ({
			id: frame.frameID,
			pos: { ...frame.preferredPos },
		}));
	}


	/**
	 * Restores a snapshot taken by `getPreferredPositionsCache`.
	 *
	 * @param cache - the snapshot
	 * @param refit - OPTIONAL; re-run the layout afterwards (default true)
	 */
	applyPreferredPositionsCache(cache: PreferredPositionsCache[], refit = true): void {

		for (const entry of cache) {
			const frame = this.mgr.getFrameByID(entry.id);
			if (frame !== null)
				frame.preferredPos = { ...entry.pos };
		}

		if (refit)
			this.fitWindows();
	}
}
