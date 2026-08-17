/*
	WindowFrameView.tsx
	-------------------

	Renders one frame: its content slots, its four resize handles, its four corner
	split/merge handles, and the modal split overlay.

	All the geometry lives in the core - this component only turns `frame.screenPos`
	into CSS and forwards pointer gestures back. Nothing here recomputes layout.
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	EDGE,
	EDGE_NEIGHBOR_STATUS,
	FRAME_STYLE,
	SPLIT_MODE,
	clamp,
	type Edge,
} from '@win-mgr/core';
import { useWindowManager, type ReactWindow, type ReactWindowFrame } from './context';
import { useReactive } from './useReactive';
import { SingleTitleBar, TabStrip } from './TabStrip';
import { MwiSurface } from './MwiSurface';
import { EmptyFrameMenu } from './EmptyFrameMenu';
import { useMenu } from './Menu';
import { buildFrameMenu } from './frameMenus';


export interface WindowFrameViewProps {
	frame: ReactWindowFrame;
}


/** Which direction a corner drag is being interpreted as. */
type Direction = 'u' | 'd' | 'l' | 'r';


export function WindowFrameView({ frame }: WindowFrameViewProps): JSX.Element {

	const mgr = useWindowManager();
	const { openMenu } = useMenu();

	const pos = useReactive(() => frame.screenPos.value);
	const style = useReactive(() => frame.frameStyle.value);
	const splitMode = useReactive(() => frame.splitMode.value);
	const windows = useReactive(() => frame.windowsRef.value);
	const currentTab = useReactive(() => frame.currentTab.value);

	const focusID = useReactive(() => mgr.frameFocusID.value);
	const showHandles = useReactive(() => mgr.showBlenderSplitMergeHandles.value);
	const mergePreviewID = useReactive(() => mgr.mergePreviewID.value);
	const mergePreviewDir = useReactive(() => mgr.mergePreviewDirection.value);

	// re-read on every layout pass so handle colouring stays current
	const edgeStatuses = useReactive(() => (
		`${frame.neighborStatus.t}|${frame.neighborStatus.b}|${frame.neighborStatus.l}|${frame.neighborStatus.r}`
	));

	const selectedEdges = useReactive(() => mgr.selectedEdges.value);

	// kept in both a ref and state: the ref is what the corner-drag closure reads when
	// it commits, the state is what actually draws the line
	const splitPosRef = useRef(-10);
	const [splitPos, setSplitPos] = useState(-10);
	const splitLayerRef = useRef<HTMLDivElement | null>(null);

	const setSplit = useCallback((value: number) => {
		splitPosRef.current = value;
		setSplitPos(value);
	}, []);

	const dimmed = (focusID !== null && focusID !== frame.frameID);
	const isMergePreview = (mergePreviewID === frame.frameID);


	// focus the split overlay as soon as it appears, so blur can cancel the operation
	useEffect(() => {

		if (splitMode === SPLIT_MODE.OFF)
			return;

		setSplit(-10);

		const id = window.setTimeout(() => splitLayerRef.current?.focus(), 0);
		return () => window.clearTimeout(id);

	}, [splitMode, setSplit]);


	/**
	 * Maps an edge's neighbour status to a class name.
	 *
	 * @param edge - the edge to describe
	 */
	const edgeClass = (edge: Edge): string => {

		// a selected edge always wins visually - it's the one being dragged
		if (selectedEdges.some(entry => entry.frame === frame && entry.edge === edge))
			return 'selected_edge';

		switch (frame.neighborStatus[edge]) {
			case EDGE_NEIGHBOR_STATUS.EXTREMITY: return 'extremity_edge';
			case EDGE_NEIGHBOR_STATUS.PARTIAL: return 'partial_edge';
			case EDGE_NEIGHBOR_STATUS.ADJACENT: return 'adjacent_edge';
			default: return 'undetermined_edge';
		}
	};

	/**
	 * Begins a resize drag from one of the four borders.
	 *
	 * @param edge - the border grabbed
	 * @param ev - the pointer event
	 */
	const onEdgePointerDown = (edge: Edge, ev: React.PointerEvent<HTMLDivElement>): void => {

		const status = frame.neighborStatus[edge];

		// nothing to push against on an outer border
		if (status === EDGE_NEIGHBOR_STATUS.UNDETERMINED || status === EDGE_NEIGHBOR_STATUS.EXTREMITY)
			return;

		ev.preventDefault();
		mgr.startEdgeDrag(frame, edge, ev.nativeEvent);
	};


	/**
	 * Tracks the cursor while the modal split overlay is up.
	 *
	 * This listens for POINTER moves, not mouse moves, and that matters: a corner
	 * gesture calls preventDefault() on its pointerdown, which per the Pointer Events
	 * spec suppresses the compatibility mouse events that would otherwise follow. An
	 * onMouseMove handler here would simply never fire during a corner-initiated split,
	 * and the cut would land wherever the overlay was initialised.
	 *
	 * @param ev - the pointer event
	 */
	const onSplitMove = (ev: React.PointerEvent<HTMLDivElement>): void => {

		const rect = ev.currentTarget.getBoundingClientRect();
		const isHorizontal = (splitMode === SPLIT_MODE.HORIZONTAL);

		const raw = isHorizontal ? (ev.clientY - rect.top) : (ev.clientX - rect.left);
		const extent = isHorizontal ? rect.height : rect.width;

		const min = mgr.smallestWidthOrHeight;
		const max = extent - mgr.smallestWidthOrHeight;

		const snapped = raw - (raw % mgr.snapSize);

		setSplit(clamp(snapped, min, max));
		splitLayerRef.current?.focus();
	};


	/**
	 * Starts a corner gesture, which resolves into either a split or a merge.
	 *
	 * Drag outward from a corner to merge that way; drag inward to split on that axis.
	 * Each corner therefore offers four operations, and reversing direction mid-drag
	 * swaps to the opposite one. Nothing commits until the pointer clears a threshold,
	 * so a stray click does nothing.
	 *
	 * @param hSide - TOP or BOTTOM, whichever corner this is
	 * @param vSide - LEFT or RIGHT, whichever corner this is
	 * @param ev - the pointer event
	 */
	const onCornerPointerDown = (hSide: Edge, vSide: Edge, ev: React.PointerEvent<HTMLDivElement>): void => {

		ev.preventDefault();

		const splitable = mgr.canSplit(frame);

		// what each of the four directions means from THIS corner
		const ops: Record<Direction, { begin: (() => void) | null; commit: () => void }> = {
			u: { begin: null, commit: () => undefined },
			d: { begin: null, commit: () => undefined },
			l: { begin: null, commit: () => undefined },
			r: { begin: null, commit: () => undefined },
		};

		const previewMerge = (edge: Edge | null): void => {

			if (edge === null) {
				mgr.mergePreviewID.value = null;
				mgr.mergePreviewDirection.value = null;
				return;
			}

			if (!mgr.canMerge(frame, edge))
				return;

			const neighbor = frame.neighbors[edge];
			if (neighbor === null)
				return;

			mgr.mergePreviewID.value = neighbor.frameID;
			mgr.mergePreviewDirection.value = ({ t: 'u', b: 'd', l: 'l', r: 'r' } as const)[edge];
		};

		const mergeInto = (edge: Edge): void => {
			if (mgr.canMerge(frame, edge))
				mgr.mergeWindowFrames(frame, edge);
		};

		const beginSplit = (axis: typeof SPLIT_MODE.HORIZONTAL | typeof SPLIT_MODE.VERTICAL) => () => {
			mgr.startFrameSplit(frame, axis);
		};

		if (hSide === EDGE.TOP) {
			ops.u = { begin: mgr.canMerge(frame, EDGE.TOP) ? () => previewMerge(EDGE.TOP) : null, commit: () => mergeInto(EDGE.TOP) };
			ops.d = { begin: splitable.h ? beginSplit(SPLIT_MODE.HORIZONTAL) : null, commit: () => commitSplit() };
		} else {
			ops.u = { begin: splitable.h ? beginSplit(SPLIT_MODE.HORIZONTAL) : null, commit: () => commitSplit() };
			ops.d = { begin: mgr.canMerge(frame, EDGE.BOTTOM) ? () => previewMerge(EDGE.BOTTOM) : null, commit: () => mergeInto(EDGE.BOTTOM) };
		}

		if (vSide === EDGE.LEFT) {
			ops.l = { begin: mgr.canMerge(frame, EDGE.LEFT) ? () => previewMerge(EDGE.LEFT) : null, commit: () => mergeInto(EDGE.LEFT) };
			ops.r = { begin: splitable.v ? beginSplit(SPLIT_MODE.VERTICAL) : null, commit: () => commitSplit() };
		} else {
			ops.l = { begin: splitable.v ? beginSplit(SPLIT_MODE.VERTICAL) : null, commit: () => commitSplit() };
			ops.r = { begin: mgr.canMerge(frame, EDGE.RIGHT) ? () => previewMerge(EDGE.RIGHT) : null, commit: () => mergeInto(EDGE.RIGHT) };
		}

		// The overlay tracks the cursor itself and stores the cut position in a ref;
		// committing just accepts wherever it got to. If the pointer never made it over
		// the overlay there's no meaningful cut to make, so cancel rather than slicing
		// a zero-width frame off the edge.
		const commitSplit = (): void => {

			if (splitPosRef.current < 0) {
				mgr.endFrameSplit(false);
				return;
			}

			mgr.endFrameSplit(true, splitPosRef.current);
		};

		let activeDir: Direction | null = null;
		let commit: (() => void) | null = null;
		let insideThreshold = true;

		const cancelOp = (): void => {
			mgr.endFrameSplit(false);
			previewMerge(null);
			activeDir = null;
			commit = null;
		};

		const startOp = (dir: Direction | null): void => {

			if (dir === null)
				return;

			const op = ops[dir];
			if (op.begin === null)
				return;

			activeDir = dir;
			commit = op.commit;
			op.begin();
		};

		mgr.dragHelper.dragStart({

			onMove: (dx, dy) => {

				const wasInside = insideThreshold;
				insideThreshold = Math.hypot(dx, dy) <= mgr.splitMergeDragThreshold;

				// coming back to the start cancels whatever we'd begun
				if (!wasInside && insideThreshold) {
					cancelOp();
					return;
				}

				if (insideThreshold)
					return;

				const dir: Direction = (Math.abs(dx) >= Math.abs(dy))
					? (dx < 0 ? 'l' : 'r')
					: (dy < 0 ? 'u' : 'd');

				// first time out of the dead zone
				if (activeDir === null) {
					startOp(dir);
					return;
				}

				// reversed along our own axis? swap to the opposite operation
				const flipped =
					(activeDir === 'l' && dx > 0)
					|| (activeDir === 'r' && dx < 0)
					|| (activeDir === 'u' && dy > 0)
					|| (activeDir === 'd' && dy < 0);

				if (flipped) {
					const opposite = ({ l: 'r', r: 'l', u: 'd', d: 'u' } as const)[activeDir];
					cancelOp();
					startOp(opposite);
				}
			},

			onEnd: () => {

				if (commit !== null) {
					commit();
					commit = null;
					activeDir = null;
					previewMerge(null);
				} else {
					cancelOp();
				}
			},

		// no pointer capture: once a split begins, the overlay that appears underneath
		// the cursor has to keep receiving mouse events so it can track where the cut
		// goes. Capturing to the corner handle would starve it.
		}, ev.nativeEvent, { capture: false });
	};


	/**
	 * Raises the frame's menu at the cursor.
	 *
	 * @param ev - the pointer event
	 */
	const onHamburgerPointerDown = (ev: React.PointerEvent<HTMLDivElement>): void => {

		ev.preventDefault();
		ev.stopPropagation();

		openMenu(buildFrameMenu(mgr, frame), ev.clientX, ev.clientY);
	};


	const isHorizontalSplit = (splitMode === SPLIT_MODE.HORIZONTAL);

	return (
		<div
			className={`windowFrame${style === FRAME_STYLE.MWI ? ' noHeader' : ''}`}
			data-frame-id={frame.frameID}
			data-edges={edgeStatuses}
			style={{
				top: `${pos.t}px`,
				left: `${pos.l}px`,
				width: `${pos.r - pos.l}px`,
				height: `${pos.b - pos.t}px`,
			}}
		>
			<div className="innerWrapper">

				{style === FRAME_STYLE.SINGLE && (
					<div className="frameHeader">
						<SingleTitleBar frame={frame} />
					</div>
				)}

				{style === FRAME_STYLE.TABBED && (
					<div className="frameHeader tabbed">
						<TabStrip frame={frame} />
						<div className="gradientFade left" />
						<div className="gradientFade right" />
					</div>
				)}

				{/* the frame menu. Lives outside the header because MWI frames have no
				    header but still need somewhere to change mode from. */}
				<div
					className="hamburgerMenu"
					title="Frame options"
					onPointerDown={onHamburgerPointerDown}
				>
					<div className="icon" />
				</div>

				<div className="frameContents">
					{style === FRAME_STYLE.MWI ? (
						<MwiSurface frame={frame} />
					) : (
						<>
							{windows.map(win => (
								<WindowSlot
									key={win.windowID}
									window={win}
									visible={isWindowVisible(style, win, windows, currentTab)}
								/>
							))}

							{windows.length === 0 && <EmptyFrameMenu frame={frame} />}
						</>
					)}
				</div>

				<div className={`focusCurtain${dimmed ? ' enabled' : ''}`} />

				<div
					className={[
						'mergeOverlay',
						isMergePreview ? 'enabled' : '',
						isMergePreview && mergePreviewDir ? mergePreviewDir : '',
					].filter(Boolean).join(' ')}
				>
					<div className="arrowGraphic" />
				</div>

				{splitMode !== SPLIT_MODE.OFF && (
					<div
						className="splitLayer"
						ref={splitLayerRef}
						tabIndex={0}
						onPointerMove={onSplitMove}
						onBlur={() => mgr.endFrameSplit(false)}
						onClick={() => mgr.endFrameSplit(true, splitPos)}
					>
						<div
							className={`splitCursorRedLine ${isHorizontalSplit ? 'horizontal' : 'vertical'}`}
							style={{
								left: isHorizontalSplit ? '0px' : `${splitPos - 2}px`,
								top: isHorizontalSplit ? `${splitPos - 2}px` : '0px',
							}}
						/>
					</div>
				)}

			</div>

			<div className={`grabHandle vertical left ${edgeClass(EDGE.LEFT)}`} onPointerDown={e => onEdgePointerDown(EDGE.LEFT, e)} />
			<div className={`grabHandle vertical right ${edgeClass(EDGE.RIGHT)}`} onPointerDown={e => onEdgePointerDown(EDGE.RIGHT, e)} />
			<div className={`grabHandle horizontal top ${edgeClass(EDGE.TOP)}`} onPointerDown={e => onEdgePointerDown(EDGE.TOP, e)} />
			<div className={`grabHandle horizontal bottom ${edgeClass(EDGE.BOTTOM)}`} onPointerDown={e => onEdgePointerDown(EDGE.BOTTOM, e)} />

			{showHandles && (
				<>
					<div className="mergeHandle TL" onPointerDown={e => onCornerPointerDown(EDGE.TOP, EDGE.LEFT, e)} />
					<div className="mergeHandle TR" onPointerDown={e => onCornerPointerDown(EDGE.TOP, EDGE.RIGHT, e)} />
					<div className="mergeHandle BL" onPointerDown={e => onCornerPointerDown(EDGE.BOTTOM, EDGE.LEFT, e)} />
					<div className="mergeHandle BR" onPointerDown={e => onCornerPointerDown(EDGE.BOTTOM, EDGE.RIGHT, e)} />
				</>
			)}
		</div>
	);
}


/**
 * Decides whether a window's slot should be on screen.
 *
 * @param style - the frame's style
 * @param win - the window in question
 * @param windows - all windows in the frame
 * @param currentTab - the frame's active tab ID
 */
function isWindowVisible(
	style: number,
	win: ReactWindow,
	windows: ReadonlyArray<ReactWindow>,
	currentTab: string | null,
): boolean {

	// a floating desktop shows everything that isn't minimised
	if (style === FRAME_STYLE.MWI)
		return !win.minimized.peek();

	// a single-view frame shows whichever window it happens to be holding
	if (style === FRAME_STYLE.SINGLE)
		return win === windows[0];

	// tabbed: only the selected one
	return win.windowID === currentTab;
}


interface WindowSlotProps {
	window: ReactWindow;
	visible: boolean;
}


/**
 * The element a window's content gets parented into.
 *
 * The ref callback is memoised per window on purpose: React only re-invokes a ref
 * callback whose identity changed, and every invocation here re-parents live DOM. An
 * inline arrow would detach and re-attach the window on every render of the frame.
 */
function WindowSlot({ window: win, visible }: WindowSlotProps): JSX.Element {

	const attach = useCallback((el: HTMLDivElement | null) => {
		win.domContainer.value = el;
	}, [win]);

	return (
		<div
			className="windowContentsContainer"
			style={{ display: visible ? 'block' : 'none' }}
		>
			<div className="windowContents" ref={attach} />
		</div>
	);
}


