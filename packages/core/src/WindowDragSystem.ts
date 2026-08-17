/*
	WindowDragSystem.ts
	-------------------

	Tearing a window out of a frame, flying it around, and dropping it somewhere else.

	Two things here are deliberately different from the Vue original.

	1. HIT TESTING IS GEOMETRY, NOT DOM.

	   The original rendered a lattice of invisible `.dropTarget` divs during a drag and
	   found them with `document.elementFromPoint()`, reading the frame ID and region
	   back out of HTML attributes. That works, but the manager already knows every
	   frame's rect to the pixel - so this asks the geometry directly. It's faster, it
	   can be unit-tested with no DOM at all, and the renderer no longer has to
	   materialise elements purely so they can be hit.

	   The region bands reproduce the original's CSS exactly (edges 15%/25% of the
	   frame, capped at 80px; edge bands sit above the centre), so the feel is unchanged.

	2. TEARING DOES NOT COLLAPSE THE SOURCE FRAME MID-DRAG.

	   The original removed the window with merge enabled, so tearing the last tab out
	   of a frame made that frame evaporate the instant you started dragging - and if
	   you then dropped on nothing, it tried to put the window back into a frame that no
	   longer existed. Here the source frame stays put while you drag and is collapsed
	   on drop instead, if it's still empty. Same end state, no orphan, and the layout
	   doesn't rearrange itself underneath a gesture in progress.
*/

import { signal, batch, type Signal } from './signal';
import { FRAME_STYLE, type EdgeRect } from './types';
import type { Window } from './Window';
import type { WindowFrame } from './WindowFrame';
import type { WindowManager } from './WindowManager';


/** Where a dragged window would land. */
export type DropRegion = 'frame' | 'tab' | 'left' | 'right' | 'top' | 'bottom';


export interface DropTarget<TComponent = unknown> {
	frame: WindowFrame<TComponent>;
	region: DropRegion;

	/** Insertion position, when region is 'tab'. */
	tabIndex: number;
}


export interface DragOperation<TComponent = unknown> {
	window: Window<TComponent>;

	/** The frame it came from, and where in that frame's tab order. */
	fromFrame: WindowFrame<TComponent>;
	fromIndex: number;

	/** Size of the window when the drag began, for sizing the flying thumbnail. */
	initialSize: { width: number; height: number };
}


/** The dashed outline the renderer draws to preview a drop. */
export interface DropPreview extends EdgeRect {
	/** True when previewing an insertion into a tab strip. */
	isTab: boolean;
}


export class WindowDragSystem<TComponent = unknown> {

	/** True for the duration of a tear-and-drop gesture. */
	readonly isDragging: Signal<boolean>;

	/** Details of the gesture in flight, or null. */
	readonly dragOperation: Signal<DragOperation<TComponent> | null>;

	/** Cursor position in container coordinates. */
	readonly dragPos: Signal<{ x: number; y: number }>;

	/** Where a drop would currently land, or null over dead space. */
	readonly dropTarget: Signal<DropTarget<TComponent> | null>;

	/** Rect for the drop preview outline, or null. */
	readonly dropPreview: Signal<DropPreview | null>;

	private readonly mgr: WindowManager<TComponent>;


	/**
	 * @param mgr - the manager this belongs to
	 */
	constructor(mgr: WindowManager<TComponent>) {

		this.mgr = mgr;

		this.isDragging = signal(false);
		this.dragOperation = signal<DragOperation<TComponent> | null>(null);
		this.dragPos = signal({ x: 0, y: 0 });
		this.dropTarget = signal<DropTarget<TComponent> | null>(null);
		this.dropPreview = signal<DropPreview | null>(null);
	}


	/**
	 * Pulls a window out of its frame and begins flying it around.
	 *
	 * The window keeps its identity throughout - the renderer re-parents its host
	 * element onto the drag layer, so the live component travels with the cursor
	 * rather than being re-created as a preview of itself.
	 *
	 * @param win - the window being torn out
	 * @param frame - the frame it currently belongs to
	 * @param startPos - cursor position in container coordinates
	 * @param initialSize - the window's on-screen size, for the flying thumbnail
	 */
	tearWindow(
		win: Window<TComponent>,
		frame: WindowFrame<TComponent>,
		startPos: { x: number; y: number },
		initialSize: { width: number; height: number },
	): void {

		const fromIndex = frame.windows.indexOf(win);

		batch(() => {

			this.dragOperation.value = {
				window: win,
				fromFrame: frame,
				fromIndex: (fromIndex >= 0) ? fromIndex : 0,
				initialSize,
			};

			this.dragPos.value = startPos;
			this.isDragging.value = true;

			// leave the source frame standing for now; it's collapsed on drop if it
			// ends up empty (see the note at the top of this file)
			frame.removeWindow(win, { noCull: true, noMerge: true });
		});

		this.updateDragPosition(startPos.x, startPos.y);
	}


	/**
	 * Moves the drag and recomputes what's under the cursor.
	 *
	 * @param x - cursor x in container coordinates
	 * @param y - cursor y in container coordinates
	 */
	updateDragPosition(x: number, y: number): void {

		batch(() => {

			this.dragPos.value = { x, y };

			const target = this.hitTest(x, y);

			this.dropTarget.value = target;
			this.dropPreview.value = (target !== null) ? this.previewFor(target) : null;
			this.mgr.frameFocusID.value = (target !== null) ? target.frame.frameID : null;
		});
	}


	/**
	 * Works out where a drop at the given point would land.
	 *
	 * Region priority matches the original's stacking order: the edge bands sit above
	 * the centre, and top/bottom above left/right, so a corner resolves to a horizontal
	 * split.
	 *
	 * @param x - point x in container coordinates
	 * @param y - point y in container coordinates
	 * @returns the target, or null if the point isn't over any frame
	 */
	hitTest(x: number, y: number): DropTarget<TComponent> | null {

		const frame = this.mgr.frames.find(f => {
			const p = f.screenPos.peek();
			return (x >= p.l && x <= p.r && y >= p.t && y <= p.b);
		});

		if (frame === undefined)
			return null;

		const pos = frame.screenPos.peek();
		const style = frame.frameStyle.peek();
		const stripHeight = this.mgr.tabStripHeight;

		// the tab strip is its own drop target: dropping here inserts at a position
		if (style === FRAME_STYLE.TABBED && y < pos.t + stripHeight)
			return { frame, region: 'tab', tabIndex: frame.windows.length };

		// a floating desktop takes a drop anywhere in its body - carving an MWI frame
		// in half on a drop would be a strange thing to want
		if (style === FRAME_STYLE.MWI)
			return { frame, region: 'frame', tabIndex: frame.windows.length };

		// everything below the strip is the frame body (MWI already returned above)
		const bodyTop = pos.t + stripHeight;
		const width = pos.r - pos.l;
		const height = pos.b - bodyTop;

		const splitable = this.mgr.canSplit(frame);

		// bands reproduce the original CSS: 15% wide / 25% tall, capped at 80px
		const sideBand = Math.min(width * 0.15, 80);
		const endBand = Math.min(height * 0.25, 80);

		if (splitable.h && y <= bodyTop + endBand)
			return { frame, region: 'top', tabIndex: 0 };

		if (splitable.h && y >= pos.b - endBand)
			return { frame, region: 'bottom', tabIndex: 0 };

		if (splitable.v && x <= pos.l + sideBand)
			return { frame, region: 'left', tabIndex: 0 };

		if (splitable.v && x >= pos.r - sideBand)
			return { frame, region: 'right', tabIndex: 0 };

		return { frame, region: 'frame', tabIndex: frame.windows.length };
	}


	/**
	 * The rect a drop preview should outline for a given target.
	 *
	 * @param target - the resolved drop target
	 */
	previewFor(target: DropTarget<TComponent>): DropPreview {

		const pos = target.frame.screenPos.peek();
		const stripHeight = this.mgr.tabStripHeight;
		const isTabbed = (target.frame.frameStyle.peek() === FRAME_STYLE.TABBED);

		const midX = pos.l + (pos.r - pos.l) / 2;
		const midY = pos.t + (pos.b - pos.t) / 2;

		switch (target.region) {

			case 'left':
				return { t: pos.t, b: pos.b, l: pos.l, r: midX, isTab: false };

			case 'right':
				return { t: pos.t, b: pos.b, l: midX, r: pos.r, isTab: false };

			case 'top':
				return { t: pos.t, b: midY, l: pos.l, r: pos.r, isTab: false };

			case 'bottom':
				return { t: midY, b: pos.b, l: pos.l, r: pos.r, isTab: false };

			case 'tab':
				return { t: pos.t + stripHeight, b: pos.b, l: pos.l, r: pos.r, isTab: true };

			default: {

				// over a floating desktop, preview the window where it would actually
				// land rather than highlighting the whole frame
				if (target.frame.frameStyle.peek() === FRAME_STYLE.MWI) {

					const op = this.dragOperation.peek();
					const at = this.dragPos.peek();
					const size = op?.initialSize ?? { width: 320, height: 240 };

					return {
						t: at.y,
						b: at.y + size.height,
						l: at.x,
						r: at.x + size.width,
						isTab: false,
					};
				}

				return {
					t: pos.t + (isTabbed ? stripHeight : 0),
					b: pos.b,
					l: pos.l,
					r: pos.r,
					isTab: isTabbed,
				};
			}
		}
	}


	/**
	 * Updates the insertion index for a tab-strip hover.
	 *
	 * The strip's own geometry lives in the renderer (tab widths depend on measured
	 * text), so it tells us where the gap should be rather than the other way round.
	 *
	 * @param index - insertion position within the target frame's tabs
	 */
	setTabInsertionIndex(index: number): void {

		const target = this.dropTarget.peek();

		if (target === null || target.region !== 'tab' || target.tabIndex === index)
			return;

		this.dropTarget.value = { ...target, tabIndex: index };
	}


	/**
	 * Completes the gesture, placing the window wherever it was dropped.
	 *
	 * With no target the window goes back where it came from, at the tab position it
	 * came from - so a cancelled drag is a true no-op rather than sending the tab to
	 * the end of the strip.
	 */
	applyDrop(): void {

		const op = this.dragOperation.peek();

		if (op === null) {
			this.endDrag();
			return;
		}

		const target = this.dropTarget.peek();

		batch(() => {

			if (target === null) {

				// nothing under the cursor: put it back exactly where it was
				this.returnToSource(op);

			} else if (target.region === 'frame' || target.region === 'tab') {

				target.frame.addWindow(op.window, { index: target.tabIndex });

				// dropping onto a floating desktop should leave the window where it was
				// let go, not at some cascade position - so convert the drop point out
				// of container space, through the frame's origin and its pan offset
				if (target.frame.frameStyle.peek() === FRAME_STYLE.MWI) {

					const framePos = target.frame.screenPos.peek();
					const pos = this.dragPos.peek();

					op.window.position.x = pos.x - framePos.l - target.frame.mwiDragX.peek();
					op.window.position.y = pos.y - framePos.t - target.frame.mwiDragY.peek();

					target.frame.focusWindow(op.window);
				}

			} else {

				// an edge band: carve the frame in half and take the new side
				const newFrame = this.mgr.splitOnDrop(target.frame, target.region);
				newFrame.frameStyle.value = target.frame.frameStyle.peek();
				newFrame.addWindow(op.window);
			}

			// the source frame may now be empty - collapse it, unless it's where the
			// window just went back to
			this.collapseSourceIfEmpty(op);

			this.mgr.cullOrphanedWindows();
			this.endDrag();
		});
	}


	/** Aborts the gesture, returning the window to where it started. */
	cancelDrag(): void {

		const op = this.dragOperation.peek();

		if (op !== null) {
			batch(() => {
				this.returnToSource(op);
				this.endDrag();
			});
			return;
		}

		this.endDrag();
	}


	/**
	 * Puts a torn window back into the frame it came from.
	 *
	 * @param op - the drag operation
	 */
	private returnToSource(op: DragOperation<TComponent>): void {

		// the source frame is normally still around, because tearing no longer
		// collapses it - but guard anyway, since a layout load could have replaced it
		if (this.mgr.frames.includes(op.fromFrame)) {
			op.fromFrame.addWindow(op.window, { index: op.fromIndex });
			return;
		}

		const fallback = this.mgr.frames[0];
		if (fallback !== undefined)
			fallback.addWindow(op.window);
	}


	/**
	 * Collapses the source frame if the drag left it empty.
	 *
	 * @param op - the drag operation
	 */
	private collapseSourceIfEmpty(op: DragOperation<TComponent>): void {

		const frame = op.fromFrame;

		if (!this.mgr.frames.includes(frame))
			return;

		if (frame.windows.length > 0)
			return;

		if (frame.frameStyle.peek() === FRAME_STYLE.MWI)
			return;

		if (this.mgr.keepEmptyFrames.peek())
			return;

		// only one frame left in the whole system? then there's nothing to merge into
		if (this.mgr.frames.length <= 1)
			return;

		frame.collapseIntoNeighbor();
	}


	/** Clears all transient drag state. */
	private endDrag(): void {

		this.isDragging.value = false;
		this.dragOperation.value = null;
		this.dropTarget.value = null;
		this.dropPreview.value = null;
		this.mgr.frameFocusID.value = null;
	}
}
