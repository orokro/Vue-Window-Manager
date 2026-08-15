/*
	WindowManager.ts
	----------------

	Owns every frame and every window, and implements the operations that change the
	shape of the layout: resize, split, merge.

	Frames and windows are held in two flat arrays. Windows are tracked separately from
	the frames that contain them because a window outlives its frame membership - it
	gets moved between frames, and lifted onto a drag layer in between, without ever
	being destroyed. Each plain array has a signal mirror (`framesRef` / `windowsRef`)
	that renderers subscribe to.

	See EdgeMap.ts for how frame relationships are derived, and WindowFrame.ts for why
	there is no layout tree.
*/

import { batch, signal, type Signal } from './signal';
import { AvailableWindowList } from './AvailableWindowList';
import { DragHelper } from './DragHelper';
import { EdgeMap, type EdgeEntry } from './EdgeMap';
import { Window } from './Window';
import { WindowFrame } from './WindowFrame';
import { WindowLayoutHelper } from './WindowLayoutHelper';
import { rangeOverlap, RANGE_OVERLAP } from './utils';
import {
	EDGE,
	EDGE_NEIGHBOR_STATUS,
	FRAME_STYLE,
	SPLIT_MODE,
	type Edge,
	type EdgeRect,
	type FrameStyle,
	type Layout,
	type SplitMode,
	type WindowDescriptorInput,
} from './types';


/** How a frame produced by a split gets filled. */
export type SplitFillMode = 'clone' | 'picker';


/** Which side of a frame a dropped window should carve out. */
export type DropSide = 'left' | 'right' | 'top' | 'bottom';


export interface SplitModeDetails<TComponent = unknown> {
	frame: WindowFrame<TComponent>;
	axis: SplitMode;
	superSplitMode: boolean;
}


export interface WindowManagerOptions<TComponent = unknown> {
	availableWindows?: ReadonlyArray<WindowDescriptorInput<TComponent>>;
	defaultLayout?: Layout | null;
	useDebugging?: boolean;
}


export class WindowManager<TComponent = unknown> {

	// ---- tunables (instance-level, unlike the original's statics, so two managers on
	// one page can disagree and so tests can dial them without global side effects) ----

	/** Frame edges snap to multiples of this, in px. Adjacency depends on it. */
	snapSize = 10;

	/** No frame may be thinner than this, in px. */
	smallestWidthOrHeight = 20;

	/** Pointer travel before a corner drag commits to split-or-merge, in px. */
	splitMergeDragThreshold = 10;

	/** Space reserved at the bottom so the lowest grab handles stay reachable, in px. */
	bottomGutter = 4;


	// ---- contents ----

	frames: WindowFrame<TComponent>[] = [];
	readonly framesRef: Signal<ReadonlyArray<WindowFrame<TComponent>>>;

	windows: Window<TComponent>[] = [];
	readonly windowsRef: Signal<ReadonlyArray<Window<TComponent>>>;

	readonly availableWindowList: AvailableWindowList<TComponent>;
	defaultLayout: Layout | null;


	// ---- collaborators ----

	readonly edgeMap: EdgeMap<TComponent>;
	readonly dragHelper: DragHelper;


	// ---- transient UI state ----

	/** True once a container element has been handed over. */
	readonly isReady: Signal<boolean>;

	/** When set, every frame EXCEPT this one dims. */
	readonly frameFocusID: Signal<string | null>;

	/** The frame about to be swallowed by a merge, and from which direction. */
	readonly mergePreviewID: Signal<string | null>;
	readonly mergePreviewDirection: Signal<'u' | 'd' | 'l' | 'r' | null>;

	/** Non-null while a modal split is in progress. */
	readonly splitModeDetails: Signal<SplitModeDetails<TComponent> | null>;

	/** Every edge currently being dragged together. */
	readonly selectedEdges: Signal<ReadonlyArray<EdgeEntry<TComponent>>>;


	// ---- settings (all live) ----

	readonly showBlenderSplitMergeHandles: Signal<boolean>;
	readonly splitFillMode: Signal<SplitFillMode>;
	readonly keepEmptyFrames: Signal<boolean>;
	readonly showMergeButtons: Signal<boolean>;
	readonly mwiTaskBar: Signal<boolean>;
	readonly mwiStartMenu: Signal<boolean>;
	readonly mwiPanFromWindowBody: Signal<boolean>;
	readonly mwiBGImagePath: Signal<string>;
	readonly useWindowingDebug: Signal<boolean>;


	/** The element frames are laid out inside. Null until the renderer mounts. */
	private _containerEl: HTMLElement | null = null;


	constructor(options: WindowManagerOptions<TComponent> = {}) {

		this.availableWindowList = new AvailableWindowList<TComponent>(options.availableWindows ?? []);
		this.defaultLayout = options.defaultLayout ?? null;

		this.framesRef = signal<ReadonlyArray<WindowFrame<TComponent>>>([]);
		this.windowsRef = signal<ReadonlyArray<Window<TComponent>>>([]);

		this.edgeMap = new EdgeMap<TComponent>(this);
		this.dragHelper = new DragHelper();

		this.isReady = signal(false);
		this.frameFocusID = signal<string | null>(null);
		this.mergePreviewID = signal<string | null>(null);
		this.mergePreviewDirection = signal<'u' | 'd' | 'l' | 'r' | null>(null);
		this.splitModeDetails = signal<SplitModeDetails<TComponent> | null>(null);
		this.selectedEdges = signal<ReadonlyArray<EdgeEntry<TComponent>>>([]);

		this.showBlenderSplitMergeHandles = signal(true);
		this.splitFillMode = signal<SplitFillMode>('clone');
		this.keepEmptyFrames = signal(false);
		this.showMergeButtons = signal(false);
		this.mwiTaskBar = signal(false);
		this.mwiStartMenu = signal(false);
		this.mwiPanFromWindowBody = signal(false);
		this.mwiBGImagePath = signal('');
		this.useWindowingDebug = signal(options.useDebugging ?? false);
	}


	// ------------------------------------------------------------------
	// container lifecycle
	// ------------------------------------------------------------------

	/**
	 * Hands the manager the element its frames live in, and loads the layout.
	 *
	 * This is idempotent on purpose. React's StrictMode mounts, unmounts and remounts
	 * every component in development, so a naive implementation loads the layout twice
	 * and you end up with two overlapping sets of frames. Calling this repeatedly with
	 * the same (or a new) element is safe.
	 *
	 * @param el - the container element
	 */
	setContainerEl(el: HTMLElement): void {

		this._containerEl = el;
		this.isReady.value = true;

		// only build a layout if we don't already have one
		if (this.frames.length === 0)
			this.loadWindowLayout();
		else
			this.edgeMap.fitWindows(false);
	}


	/** Forgets the container element. Frames and windows are left intact. */
	unsetContainerEl(): void {
		this._containerEl = null;
		this.isReady.value = false;
	}


	/** Current container size in px, or zeroes if not mounted. */
	getContainerSize(): { width: number; height: number } {

		if (this._containerEl === null)
			return { width: 0, height: 0 };

		return {
			width: this._containerEl.offsetWidth,
			height: this._containerEl.offsetHeight,
		};
	}


	/** The container element, or null. */
	get containerEl(): HTMLElement | null {
		return this._containerEl;
	}


	/** Called by the renderer's resize observer. */
	onContainerResize(): void {
		this.edgeMap.fitWindows();
	}


	// ------------------------------------------------------------------
	// layout load / save
	// ------------------------------------------------------------------

	/** Loads the configured default layout (or the built-in one). */
	loadWindowLayout(): void {
		WindowLayoutHelper.loadDefaultLayout(this);
	}


	/**
	 * Replaces the current arrangement with a layout definition.
	 *
	 * @param layout - the layout to load
	 */
	loadLayout(layout: Layout): void {
		this.clearWindowLayout();
		WindowLayoutHelper.loadLayout(layout, this);
	}


	/** Returns to the configured default (or built-in) layout. */
	resetLayout(): void {
		this.clearWindowLayout();
		WindowLayoutHelper.loadDefaultLayout(this);
	}


	/** Captures the current arrangement in a form `loadLayout` can restore. */
	getLayoutDetails(): Layout {
		return WindowLayoutHelper.getLayoutObject(this);
	}


	/** Throws away all frames and windows. */
	clearWindowLayout(): void {

		batch(() => {
			this.frames = [];
			this.framesRef.value = this.frames;
			this.windows = [];
			this.windowsRef.value = this.windows;
			this.frameFocusID.value = null;
			this.mergePreviewID.value = null;
			this.selectedEdges.value = [];
		});
	}


	// ------------------------------------------------------------------
	// frames
	// ------------------------------------------------------------------

	/**
	 * Creates a frame covering the given pixel rect.
	 *
	 * @param rect - the rect, in the current layout's coordinate space
	 * @param fitWindows - OPTIONAL; re-run layout afterwards
	 * @param options - OPTIONAL; frame style options
	 * @returns the new frame
	 */
	addWindowFrame(
		rect: EdgeRect,
		fitWindows = false,
		options: { frameStyle?: FrameStyle } = {},
	): WindowFrame<TComponent> {

		const frame = new WindowFrame<TComponent>(this, options);
		frame.updateFramePos(rect);

		this.frames = [...this.frames, frame];
		this.framesRef.value = this.frames;

		if (fitWindows)
			this.edgeMap.fitWindows(true);

		return frame;
	}


	/**
	 * Finds a frame by ID.
	 *
	 * @param frameID - a full ID string ("frame_3") or the bare number
	 */
	getFrameByID(frameID: string | number): WindowFrame<TComponent> | null {

		const id = (typeof frameID === 'number') ? `frame_${frameID}` : frameID;
		return this.frames.find(f => f.frameID === id) ?? null;
	}


	/**
	 * Finds the frame currently holding a window.
	 *
	 * @param window - the window to locate
	 */
	getFrameFromWindow(window: Window<TComponent> | null): WindowFrame<TComponent> | null {

		if (window === null)
			return null;

		return this.frames.find(f => f.windows.includes(window)) ?? null;
	}


	/**
	 * Removes a frame.
	 *
	 * @param handle - the frame, its ID string, or its numeric ID
	 * @param fitWindows - OPTIONAL; re-run layout afterwards
	 */
	removeWindowFrame(handle: WindowFrame<TComponent> | string | number, fitWindows = false): void {

		const frame = (handle instanceof WindowFrame) ? handle : this.getFrameByID(handle);

		if (frame === null) {
			console.error('[win-mgr] tried to remove a frame that does not exist');
			return;
		}

		this.frames = this.frames.filter(f => f !== frame);
		this.framesRef.value = this.frames;

		if (fitWindows)
			this.edgeMap.fitWindows(true);
	}


	// ------------------------------------------------------------------
	// splitting
	// ------------------------------------------------------------------

	/**
	 * Enters modal split mode on a frame.
	 *
	 * The renderer takes over from here: it shows a line following the cursor, and
	 * calls `endFrameSplit` when the user commits or cancels.
	 *
	 * @param frame - the frame to split
	 * @param axis - HORIZONTAL or VERTICAL
	 * @param superSplitMode - OPTIONAL; allow the split to hop to another frame
	 */
	startFrameSplit(frame: WindowFrame<TComponent>, axis: SplitMode, superSplitMode = false): void {

		batch(() => {
			this.splitModeDetails.value = { frame, axis, superSplitMode };
			frame.splitMode.value = axis;
			this.frameFocusID.value = frame.frameID;
		});
	}


	/**
	 * Leaves split mode, optionally performing the split.
	 *
	 * @param complete - true to actually split, false to cancel
	 * @param splitPos - OPTIONAL; offset from the frame's top/left where the cut lands
	 */
	endFrameSplit(complete: boolean, splitPos?: number): void {

		const details = this.splitModeDetails.peek();
		if (details === null)
			return;

		batch(() => {

			details.frame.splitMode.value = SPLIT_MODE.OFF;

			if (complete && splitPos !== undefined) {

				const { frame, axis } = details;
				const pos = { ...frame.screenPos.peek() };

				let newFrame: WindowFrame<TComponent>;

				if (axis === SPLIT_MODE.HORIZONTAL) {

					const cut = pos.t + splitPos;
					frame.updateFramePos({ b: cut });
					newFrame = this.addWindowFrame({ t: cut, b: pos.b, l: pos.l, r: pos.r });

				} else {

					const cut = pos.l + splitPos;
					frame.updateFramePos({ r: cut });
					newFrame = this.addWindowFrame({ t: pos.t, b: pos.b, l: cut, r: pos.r });
				}

				this.populateSplitFrame(frame, newFrame);

				if (this.isReady.peek())
					this.edgeMap.fitWindows(true);
			}

			this.splitModeDetails.value = null;
			this.frameFocusID.value = null;
		});
	}


	/**
	 * Fills a frame that a split just produced.
	 *
	 * In 'clone' mode the new frame inherits the source's style and a fresh copy of its
	 * active window - split a 3D view in Blender and you get another 3D view, never a
	 * blank panel. In 'picker' mode it's left empty for the picker UI to take over.
	 *
	 * @param sourceFrame - the frame that was split
	 * @param newFrame - the frame that was created
	 */
	populateSplitFrame(sourceFrame: WindowFrame<TComponent>, newFrame: WindowFrame<TComponent>): void {

		if (this.splitFillMode.peek() !== 'clone')
			return;

		// an empty floating desktop is a perfectly good result, so don't clone into MWI
		if (sourceFrame.frameStyle.peek() === FRAME_STYLE.MWI)
			return;

		const sourceWin = sourceFrame.getActiveWindow();
		if (sourceWin === null)
			return;

		newFrame.frameStyle.value = sourceFrame.frameStyle.peek();

		const kind = sourceWin.kindRef.peek();
		if (kind === null)
			return;

		newFrame.addWindow(this.createWindow(kind, { ...sourceWin.props }));
	}


	/**
	 * Halves a frame so a dropped window can take one side.
	 *
	 * @param frame - the frame being dropped onto
	 * @param side - which half the incoming window gets
	 * @returns the newly-created frame
	 */
	splitOnDrop(frame: WindowFrame<TComponent>, side: DropSide): WindowFrame<TComponent> {

		const pos = { ...frame.screenPos.peek() };
		const midX = pos.l + (pos.r - pos.l) / 2;
		const midY = pos.t + (pos.b - pos.t) / 2;

		let newFrame: WindowFrame<TComponent>;

		switch (side) {

			case 'left':
				frame.updateFramePos({ l: midX });
				newFrame = this.addWindowFrame({ t: pos.t, b: pos.b, l: pos.l, r: midX });
				break;

			case 'right':
				frame.updateFramePos({ r: midX });
				newFrame = this.addWindowFrame({ t: pos.t, b: pos.b, l: midX, r: pos.r });
				break;

			case 'top':
				frame.updateFramePos({ t: midY });
				newFrame = this.addWindowFrame({ t: pos.t, b: midY, l: pos.l, r: pos.r });
				break;

			case 'bottom':
				frame.updateFramePos({ b: midY });
				newFrame = this.addWindowFrame({ t: midY, b: pos.b, l: pos.l, r: pos.r });
				break;
		}

		this.edgeMap.fitWindows(true);
		return newFrame;
	}


	// ------------------------------------------------------------------
	// merging
	// ------------------------------------------------------------------

	/**
	 * Expands a frame over its neighbour on the given edge, deleting the neighbour.
	 *
	 * This is the whole of "merge" - because layout is geometric rather than a tree,
	 * absorbing a neighbour is just a matter of growing a rectangle.
	 *
	 * @param frame - the frame that survives
	 * @param edge - the edge whose neighbour gets absorbed
	 */
	mergeWindowFrames(frame: WindowFrame<TComponent>, edge: Edge): void {

		const neighbor = frame.neighbors[edge];

		if (neighbor === null) {
			console.error('[win-mgr] attempted a merge with a neighbour that does not exist');
			return;
		}

		batch(() => {

			frame.preferredPos = {
				t: Math.min(frame.preferredPos.t, neighbor.preferredPos.t),
				b: Math.max(frame.preferredPos.b, neighbor.preferredPos.b),
				l: Math.min(frame.preferredPos.l, neighbor.preferredPos.l),
				r: Math.max(frame.preferredPos.r, neighbor.preferredPos.r),
			};

			this.removeWindowFrame(neighbor);
			this.edgeMap.fitWindows();
		});
	}


	// ------------------------------------------------------------------
	// edge dragging (resize)
	// ------------------------------------------------------------------

	/**
	 * Starts a resize drag from one frame's edge.
	 *
	 * Every edge transitively connected to this one moves as a unit, so dragging a
	 * divider between two columns takes the whole column of stacked frames with it.
	 *
	 * @param frame - the frame whose edge was grabbed
	 * @param edge - which edge
	 * @param ev - OPTIONAL; the originating pointer event, for pointer capture
	 */
	startEdgeDrag(frame: WindowFrame<TComponent>, edge: Edge, ev?: PointerEvent): void {

		this.selectEdges(frame, edge);

		const isVerticalEdge = (edge === EDGE.LEFT || edge === EDGE.RIGHT);
		const { width, height } = this.getContainerSize();

		if (width <= 0 || height <= 0)
			return;

		const startFraction = frame.preferredPos[edge];

		this.dragHelper.dragStart({

			onMove: (dx, dy) => {

				// snapshot first, so an illegal position can be rolled straight back
				const cache = this.edgeMap.getPreferredPositionsCache();

				const delta = isVerticalEdge ? (dx / width) : (dy / height);
				const next = startFraction + delta;

				for (const selected of this.selectedEdges.peek())
					selected.frame.preferredPos[selected.edge] = next;

				const fitted = this.edgeMap.fitWindows(false);

				if (!this.edgeMap.checkValidLayout(fitted.width, fitted.height))
					this.edgeMap.applyPreferredPositionsCache(cache);
			},

			onEnd: () => {
				this.endEdgeDrag();
			},

		}, ev);
	}


	/**
	 * Selects every edge that should move together with the given one.
	 *
	 * @param frame - the frame whose edge was grabbed
	 * @param edge - which edge
	 */
	selectEdges(frame: WindowFrame<TComponent>, edge: Edge): void {
		this.selectedEdges.value = this.findConnectedEdges(frame, edge);
	}


	/**
	 * Flood-fills outward from one edge to find every edge colinear with it and
	 * transitively overlapping it.
	 *
	 * Start with the grabbed edge's span. Any edge sitting at the same coordinate whose
	 * own span overlaps the running span joins the set and widens it. Repeat until a
	 * pass adds nothing - which is what makes a divider shared by frames of different
	 * heights still move as one piece.
	 *
	 * @param frame - the frame whose edge was grabbed
	 * @param edge - which edge
	 * @returns every connected edge, including the one passed in
	 */
	findConnectedEdges(frame: WindowFrame<TComponent>, edge: Edge): EdgeEntry<TComponent>[] {

		const connected: EdgeEntry<TComponent>[] = [{ frame, edge }];

		// make sure we're reading a current picture of the world
		this.edgeMap.rebuildMap();

		const framePos = frame.screenPos.peek();
		const isVerticalEdge = (edge === EDGE.LEFT || edge === EDGE.RIGHT);

		// a vertical edge sits at an x position and spans top..bottom
		const spanLo: Edge = isVerticalEdge ? EDGE.TOP : EDGE.LEFT;
		const spanHi: Edge = isVerticalEdge ? EDGE.BOTTOM : EDGE.RIGHT;
		const map = isVerticalEdge ? this.edgeMap.hMap : this.edgeMap.vMap;

		let candidates = (map.get(framePos[edge]) ?? []).filter(i => i.frame !== frame);

		let rangeLo = framePos[spanLo];
		let rangeHi = framePos[spanHi];

		// keep sweeping until a full pass finds nothing new
		for (;;) {

			let grew = false;

			for (const candidate of candidates) {

				const otherPos = candidate.frame.screenPos.peek();
				const overlap = rangeOverlap(rangeLo, rangeHi, otherPos[spanLo], otherPos[spanHi]);

				if (overlap === RANGE_OVERLAP.NO_OVERLAP)
					continue;

				connected.push(candidate);
				candidates = candidates.filter(i => i !== candidate);

				rangeLo = Math.min(rangeLo, otherPos[spanLo]);
				rangeHi = Math.max(rangeHi, otherPos[spanHi]);

				grew = true;
				break;
			}

			if (!grew)
				break;
		}

		return connected;
	}


	/** Clears the selected-edge highlight after a resize drag. */
	endEdgeDrag(): void {
		this.selectedEdges.value = [];
	}


	/**
	 * Whether a frame can merge across the given edge (or any edge, if omitted).
	 *
	 * @param frame - the frame to test
	 * @param edge - OPTIONAL; a specific edge
	 */
	canMerge(frame: WindowFrame<TComponent>, edge?: Edge): boolean {

		if (edge !== undefined)
			return frame.neighborStatus[edge] === EDGE_NEIGHBOR_STATUS.ADJACENT;

		return ([EDGE.TOP, EDGE.BOTTOM, EDGE.LEFT, EDGE.RIGHT] as const)
			.some(e => frame.neighborStatus[e] === EDGE_NEIGHBOR_STATUS.ADJACENT);
	}


	/**
	 * Whether a frame is big enough to survive being cut in half on each axis.
	 *
	 * @param frame - the frame to test
	 */
	canSplit(frame: WindowFrame<TComponent>): { h: boolean; v: boolean; neither: boolean } {

		// both halves have to clear the minimum, hence double
		const minimum = this.smallestWidthOrHeight * 2;
		const dim = frame.getFrameDim();

		const h = dim.height > minimum;
		const v = dim.width > minimum;

		return { h, v, neither: !h && !v };
	}


	// ------------------------------------------------------------------
	// windows
	// ------------------------------------------------------------------

	/**
	 * Creates a window. It is not attached to any frame yet.
	 *
	 * @param kind - the window kind slug
	 * @param props - OPTIONAL; props for the component
	 */
	createWindow(kind: string, props: Record<string, unknown> = {}): Window<TComponent> {

		if (kind == null)
			throw new Error('[win-mgr] cannot create a window without a kind');

		const win = new Window<TComponent>(this, kind, props);

		this.windows = [...this.windows, win];
		this.windowsRef.value = this.windows;

		return win;
	}


	/** Drops any window that is no longer inside a frame. */
	cullOrphanedWindows(): void {

		const living = this.frames.flatMap(frame => frame.windows);

		this.windows = living;
		this.windowsRef.value = this.windows;
	}


	/** Releases global listeners. Call when the manager is discarded. */
	destroy(): void {
		this.dragHelper.destroy();
	}
}
