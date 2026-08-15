/*
	WindowHost.tsx
	--------------

	Renders one window's content, and keeps it alive as the window moves between frames.

	This is the single most important file in the React binding, so it's worth being
	explicit about why it looks the way it does.

	The Vue original uses <Teleport>, which MOVES existing DOM when its target changes.
	React's createPortal does not: change the container you pass it and React unmounts
	the subtree from the old container and mounts a fresh one in the new. Verified, not
	assumed - a portal retarget gives you a different DOM node, a remounted component,
	lost state, and effects that run a second time. For a window manager whose entire
	premise is "drag a live window somewhere else", that is fatal. A canvas would blank,
	an iframe would reload, a video would restart.

	The fix is to stop letting React own the moving part:

		- each window gets ONE host element, created imperatively and kept for the
		  window's whole life
		- we portal into that host exactly once, and never change the container, so
		  React has no reason to reconcile it away
		- when the window docks somewhere else, we move the HOST ITSELF with
		  appendChild, which relocates live DOM without touching React at all

	The result matches Vue's behaviour exactly, including its one limitation: the
	browser resets scrollTop when an element is re-parented, so a scrolled window comes
	back at the top. Vue's Teleport has the same behaviour; this is a DOM fact, not a
	React one.
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { effect } from '@win-mgr/core';
import { FrameContext, WindowContext, type ReactWindow, type ReactWindowFrame } from './context';
import { useReactive } from './useReactive';


export interface WindowHostProps {

	/** The window to render. */
	window: ReactWindow;

	/** Where to park the host until a frame claims it. */
	penEl: HTMLElement | null;
}


/**
 * Hosts a single window's component behind a stable, hand-managed DOM node.
 */
export function WindowHost({ window: win, penEl }: WindowHostProps): JSX.Element | null {

	// ONE host element for this window's entire life. Created imperatively so React
	// never re-creates it - that stability is the whole trick.
	const host = useMemo(() => {

		if (typeof document === 'undefined')
			return null;

		const el = document.createElement('div');
		el.className = 'appViewContainer';
		el.dataset.windowId = win.windowID;
		return el;

	}, [win.windowID]);

	// re-parent the host whenever the core says this window belongs somewhere else
	useLayoutEffect(() => {

		if (host === null)
			return;

		const dispose = effect(() => {

			// subscribing to domContainer is what makes this re-run on a dock
			const target = win.domContainer.value ?? penEl;

			if (target != null && host.parentElement !== target)
				target.appendChild(host);
		});

		return () => {
			dispose();
		};

	}, [host, penEl, win]);

	// on unmount, take the host out of the document with us
	useEffect(() => {

		return () => {
			host?.remove();
		};

	}, [host]);

	// the component to render, and the frame we currently belong to
	const Component = useReactive(() => win.windowDetails.window);
	const frame = useReactive<ReactWindowFrame | null>(() => win.frameRef.value);

	if (host === null)
		return null;

	return createPortal(
		<WindowContext.Provider value={win}>
			<FrameContext.Provider value={frame}>
				<WindowContentBoundary component={Component} props={win.props} />
			</FrameContext.Provider>
		</WindowContext.Provider>,
		host,
	);
}


interface BoundaryProps {
	component: unknown;
	props: Record<string, unknown>;
}


/**
 * Renders the user's component, or a visible placeholder if the kind couldn't be
 * resolved. A layout referencing a window kind that isn't registered should look
 * obviously wrong, not crash the manager.
 */
function WindowContentBoundary({ component, props }: BoundaryProps): JSX.Element {

	const Component = component as React.ComponentType<Record<string, unknown>> | null;

	// keep the "unknown kind" branch from re-rendering pointlessly
	const placeholderRef = useRef<string>('This window kind is not registered.');

	if (Component == null || typeof Component !== 'function') {
		return (
			<div className="windowKindMissing">
				{placeholderRef.current}
			</div>
		);
	}

	return <Component {...props} />;
}


/**
 * Creates and mounts the hidden holding-pen element.
 *
 * Windows exist before any frame does (a layout creates all its windows, then the
 * frames render), so they need somewhere legal to live in the meantime.
 *
 * @returns [pen element, ref callback to attach to a div]
 */
export function useWindowPen(): [HTMLElement | null, (el: HTMLDivElement | null) => void] {

	const [penEl, setPenEl] = useState<HTMLElement | null>(null);
	return [penEl, setPenEl];
}
