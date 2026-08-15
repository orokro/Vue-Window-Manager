/*
	WindowDragLayer.tsx
	-------------------

	The layer a torn-out window flies around on, plus the dashed outline previewing
	where it will land.

	The thing worth noticing: the flying thumbnail is not a screenshot or a stand-in.
	It's the window itself. `WindowHost` parents each window's content into whatever
	element `window.domContainer` points at, so this component simply claims that
	pointer for the duration of the drag and the live component - canvas contents,
	scroll state, running timers and all - comes with it.

	The thumbnail is scaled with a CSS transform rather than by resizing the element,
	so the window's contents never reflow while it's in flight.
*/

import { useLayoutEffect, useRef } from 'react';
import { useWindowManager } from './context';
import { useReactive } from './useReactive';


/** Widest the flying thumbnail is allowed to be, in px. */
const MAX_THUMB_WIDTH = 360;


export function WindowDragLayer(): JSX.Element | null {

	const mgr = useWindowManager();
	const dragSys = mgr.windowDragSystem;

	const isDragging = useReactive(() => dragSys.isDragging.value);
	const dragPos = useReactive(() => dragSys.dragPos.value);
	const preview = useReactive(() => dragSys.dropPreview.value);
	const operation = useReactive(() => dragSys.dragOperation.value);

	const thumbRef = useRef<HTMLDivElement | null>(null);

	// claim the dragged window's content for as long as we're up
	useLayoutEffect(() => {

		const win = operation?.window;
		const thumb = thumbRef.current;

		if (win == null || thumb == null)
			return;

		win.domContainer.value = thumb;

		return () => {
			// Only release it if nobody else has taken it. On drop, the destination
			// frame's slot mounts and claims the window in the same commit that
			// unmounts this layer - clearing unconditionally would yank the window
			// straight back out into the hidden pen.
			if (win.domContainer.peek() === thumb)
				win.domContainer.value = null;
		};

	}, [operation]);

	if (!isDragging || operation === null)
		return null;

	const title = operation.window.titleRef.peek();
	const icon = operation.window.windowDetails.icon;

	const naturalWidth = Math.max(operation.initialSize.width, 1);
	const scale = Math.min(1, MAX_THUMB_WIDTH / naturalWidth);

	return (
		<div className="windowDragLayer">

			{preview !== null && (
				<div
					className={`dropPreview${preview.isTab ? ' isTab' : ''}`}
					style={{
						left: `${preview.l}px`,
						top: `${preview.t}px`,
						width: `${preview.r - preview.l}px`,
						height: `${preview.b - preview.t}px`,
					}}
				/>
			)}

			<div
				className="dragChip"
				style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
			>
				<div className={`dragTitle${icon !== '' ? ' hasIcon' : ''}`}>
					{icon !== '' && <div className="icon" style={{ backgroundImage: `url(${icon})` }} />}
					{title}
				</div>

				<div
					className="windowThumb"
					ref={thumbRef}
					style={{
						width: `${operation.initialSize.width}px`,
						height: `${operation.initialSize.height}px`,
						transform: `scale(${scale})`,
					}}
				/>
			</div>
		</div>
	);
}
