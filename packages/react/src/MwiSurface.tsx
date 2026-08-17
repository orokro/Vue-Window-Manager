/*
	MwiSurface.tsx
	--------------

	The floating-window mode: a desktop inside a frame, with windows that carry their
	own position, size and stacking.

	MWI stands for Multiple Window Interface - the old MDI idea, except these are
	windows rather than documents. Everything a floating window needs was already on the
	core model from the first slice (`Window.position`, `Window.size`, `frame.mwiDragX/Y`,
	`frame.focusWindow`), so this file is almost entirely gestures and chrome.

	Three behaviours worth calling out:

	  - Dragging a title bar OUT of the frame tears the window loose, handing off to the
	    same drag system the tabs use. So you can drag a floating window straight onto
	    another frame's tab strip and dock it.
	  - Right-click-dragging the background pans the whole desktop. The window bodies
	    keep their own right-click unless `mwiPanFromWindowBody` is on, so a window's
	    content can have its own context menu.
	  - A right-click that doesn't move is not a pan, and is left alone for the menu.
*/

import { useCallback, useEffect, useRef } from 'react';
import { FRAME_STYLE } from '@win-mgr/core';
import { useWindowManager, type ReactWindow, type ReactWindowFrame } from './context';
import { useReactive } from './useReactive';
import { toContainerPoint } from './coords';


/** Smallest a floating window may be dragged down to. */
const MIN_W = 140;
const MIN_H = 60;

/** Which edges a resize handle drives. */
const HANDLES: ReadonlyArray<{ cls: string; sides: ReadonlyArray<'l' | 'r' | 't' | 'b'> }> = [
	{ cls: 'left', sides: ['l'] },
	{ cls: 'right', sides: ['r'] },
	{ cls: 'top', sides: ['t'] },
	{ cls: 'bottom', sides: ['b'] },
	{ cls: 'tl', sides: ['t', 'l'] },
	{ cls: 'tr', sides: ['t', 'r'] },
	{ cls: 'bl', sides: ['b', 'l'] },
	{ cls: 'br', sides: ['b', 'r'] },
];


export function MwiSurface({ frame }: { frame: ReactWindowFrame }): JSX.Element {

	const mgr = useWindowManager();

	const windows = useReactive(() => frame.windowsRef.value);
	const panX = useReactive(() => frame.mwiDragX.value);
	const panY = useReactive(() => frame.mwiDragY.value);

	const isPanning = useRef(false);


	/**
	 * Right-click-drag on the desktop pans every window at once.
	 *
	 * @param ev - the pointer event
	 */
	const onSurfacePointerDown = (ev: React.PointerEvent<HTMLDivElement>): void => {

		// button 2 is the secondary button; anything else belongs to the windows
		if (ev.button !== 2)
			return;

		ev.preventDefault();

		const startX = frame.mwiDragX.peek();
		const startY = frame.mwiDragY.peek();
		isPanning.current = false;

		mgr.dragHelper.dragStart({

			onMove: (dx, dy) => {
				if (Math.abs(dx) + Math.abs(dy) > 3)
					isPanning.current = true;
				frame.mwiDragX.value = startX + dx;
				frame.mwiDragY.value = startY + dy;
			},

		}, ev.nativeEvent, { capture: false });
	};


	/**
	 * Swallows the browser context menu that follows a pan.
	 *
	 * @param ev - the mouse event
	 */
	const onContextMenu = (ev: React.MouseEvent): void => {
		if (isPanning.current) {
			ev.preventDefault();
			isPanning.current = false;
		}
	};

	return (
		<div
			className="mwiSurface"
			onPointerDown={onSurfacePointerDown}
			onContextMenu={onContextMenu}
			style={{ backgroundPosition: `${panX}px ${panY}px` }}
		>
			<div className="mwiPanLayer" style={{ left: `${panX}px`, top: `${panY}px` }}>
				{windows.map(win => (
					<MwiWindow key={win.windowID} frame={frame} win={win} />
				))}
			</div>

			{windows.length === 0 && (
				<div className="mwiEmptyHint">
					Empty desktop &mdash; use the frame menu to add a window
				</div>
			)}
		</div>
	);
}


interface MwiWindowProps {
	frame: ReactWindowFrame;
	win: ReactWindow;
}


/**
 * One floating window: title bar, content slot, and eight resize grips.
 */
function MwiWindow({ frame, win }: MwiWindowProps): JSX.Element | null {

	const mgr = useWindowManager();

	// `position` and `size` are per-key signals, and useReactive needs a stable value
	// rather than a fresh object each read - so join them into a string and split it
	// back out. Cheap, and it keeps the subscription fine-grained.
	const posKey = useReactive(() => `${win.position.x ?? 0},${win.position.y ?? 0},${win.position.z ?? 0}`);
	const sizeKey = useReactive(() => `${win.size.width},${win.size.height}`);

	const minimized = useReactive(() => win.minimized.value);
	const title = useReactive(() => win.titleRef.value);

	const [x, y, z] = posKey.split(',').map(Number);
	const [width, height] = sizeKey.split(',').map(Number);

	// stable ref callback: React only re-invokes it when its identity changes, and each
	// invocation re-parents live DOM
	const attach = useCallback((el: HTMLDivElement | null) => {
		win.domContainer.value = el;
	}, [win]);


	const rootRef = useRef<HTMLDivElement | null>(null);

	// Raise-on-click has to be a NATIVE listener, not a React prop.
	//
	// A window's content is rendered through a portal, and React dispatches portal
	// events along the REACT tree - whose parent here is WindowManagerView, not this
	// component. So a React onPointerDown on this div never sees a click that landed on
	// the window's own content, and clicking a window's body wouldn't raise it. The DOM
	// tree has no such gap: the host element really is a descendant of this div, so a
	// native listener catches everything.
	//
	// Anything else in this library that needs to observe activity inside a window has
	// the same constraint.
	useEffect(() => {

		const el = rootRef.current;
		if (el === null)
			return;

		const onDown = (ev: PointerEvent): void => {

			frame.focusWindow(win);

			// keep right-click for the window's own content unless panning from the
			// body was explicitly asked for. Stopping propagation here means the
			// event never reaches React's root listener, so the desktop's pan handler
			// never runs - which is exactly what we want, and only for button 2.
			if (ev.button === 2 && !mgr.mwiPanFromWindowBody.peek())
				ev.stopPropagation();
		};

		el.addEventListener('pointerdown', onDown);
		return () => el.removeEventListener('pointerdown', onDown);

	}, [frame, win, mgr]);


	/**
	 * Title-bar drag: move the window, or tear it out if it leaves the frame.
	 *
	 * @param ev - the pointer event
	 */
	const onTitlePointerDown = (ev: React.PointerEvent<HTMLDivElement>): void => {

		// a title bar never pans, whichever button was used
		if (ev.button === 2) {
			ev.stopPropagation();
			return;
		}

		if (ev.button !== 0)
			return;

		ev.preventDefault();
		ev.stopPropagation();

		frame.focusWindow(win);

		const container = mgr.containerEl;
		if (container === null)
			return;

		const startX = win.position.x ?? 0;
		const startY = win.position.y ?? 0;
		let torn = false;

		mgr.dragHelper.dragStart({

			onMove: (dx, dy, moveEv) => {

				const p = toContainerPoint(container, moveEv.clientX, moveEv.clientY);

				if (torn) {
					mgr.windowDragSystem.updateDragPosition(p.x, p.y);
					return;
				}

				// left the frame? then this is a dock gesture, not a move
				const framePos = frame.screenPos.peek();
				const outside = (p.x < framePos.l || p.x > framePos.r || p.y < framePos.t || p.y > framePos.b);

				if (outside) {
					torn = true;
					mgr.windowDragSystem.tearWindow(win, frame, p, {
						width: win.size.width,
						height: win.size.height,
					});
					return;
				}

				win.position.x = startX + dx;
				win.position.y = startY + dy;
			},

			onEnd: () => {
				if (torn)
					mgr.windowDragSystem.applyDrop();
			},

		}, ev.nativeEvent, { capture: false });
	};


	/**
	 * Resize from one of the eight grips.
	 *
	 * @param ev - the pointer event
	 * @param sides - which edges this grip moves
	 */
	const onResizePointerDown = (
		ev: React.PointerEvent<HTMLDivElement>,
		sides: ReadonlyArray<'l' | 'r' | 't' | 'b'>,
	): void => {

		if (ev.button !== 0)
			return;

		ev.preventDefault();
		ev.stopPropagation();

		frame.focusWindow(win);

		const start = {
			x: win.position.x ?? 0,
			y: win.position.y ?? 0,
			w: win.size.width,
			h: win.size.height,
		};

		mgr.dragHelper.dragStart({

			onMove: (dx, dy) => {

				for (const side of sides) {

					// dragging a left or top edge moves the window AND resizes it, and
					// the clamp has to stop the far edge running away when it bottoms out
					if (side === 'l') {
						const w = Math.max(MIN_W, start.w - dx);
						win.position.x = start.x + (start.w - w);
						win.size.width = w;
					}

					if (side === 't') {
						const h = Math.max(MIN_H, start.h - dy);
						win.position.y = start.y + (start.h - h);
						win.size.height = h;
					}

					if (side === 'r')
						win.size.width = Math.max(MIN_W, start.w + dx);

					if (side === 'b')
						win.size.height = Math.max(MIN_H, start.h + dy);
				}
			},

		}, ev.nativeEvent, { capture: false });
	};


	if (minimized)
		return null;

	return (
		<div
			className="mwiWindow"
			data-window-id={win.windowID}
			ref={rootRef}
			style={{ left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, zIndex: z }}
		>
			<div className="mwiTitleBar" onPointerDown={onTitlePointerDown}>

				{win.windowDetails.icon !== '' && (
					<div className="icon" style={{ backgroundImage: `url(${win.windowDetails.icon})` }} />
				)}

				<div className="titleText">{title}</div>

				<div
					className="closeButton"
					onPointerDown={e => { e.stopPropagation(); frame.removeWindow(win); }}
				>
					<span>✕</span>
				</div>
			</div>

			<div className="mwiContents">
				<div className="windowContents" ref={attach} />
			</div>

			{HANDLES.map(h => (
				<div
					key={h.cls}
					className={`mwiResizeHandle ${h.cls}`}
					onPointerDown={e => onResizePointerDown(e, h.sides)}
				/>
			))}
		</div>
	);
}


/** True when a frame should render as a floating desktop. */
export function isMwi(frame: ReactWindowFrame): boolean {
	return frame.frameStyle.peek() === FRAME_STYLE.MWI;
}
