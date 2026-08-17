/*
	WindowManagerView.tsx
	---------------------

	The component consumers actually render. Owns one core WindowManager instance and
	wires it to the DOM: a measured container for frames, a hidden pen for windows that
	don't have a home yet, and the theme variables everything paints from.

	Note how little state lives in React here. The manager is created once and never
	replaces itself; frames and windows come out of signals through useReactive. React's
	job in this library is to render, not to remember.
*/

import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	forwardRef,
	type CSSProperties,
	type ReactNode,
} from 'react';
import {
	WindowManager as CoreWindowManager,
	type Layout,
	type WindowDescriptorInput,
} from '@win-mgr/core';
import {
	WindowManagerContext,
	type ReactWindowManager,
	type WindowComponent,
} from './context';
import { useReactive } from './useReactive';
import { WindowFrameView } from './WindowFrameView';
import { WindowDragLayer } from './WindowDragLayer';
import { WindowHost } from './WindowHost';
import { MenuProvider } from './Menu';
import { themeToCssVars, type ThemeOverrides } from './theme';


export interface WindowManagerProps {

	/** Window kinds this manager may spawn. */
	availableWindows?: ReadonlyArray<WindowDescriptorInput<WindowComponent>>;

	/** The starting arrangement. */
	defaultLayout?: Layout | null;

	/** Show the Blender-style corner split/merge handles. Default true. */
	splitMergeHandles?: boolean;

	/** Keep an emptied frame instead of collapsing it. Default false. */
	keepEmptyFrames?: boolean;

	/** Show merge-arrow buttons on an empty frame's adjacent edges. Default false. */
	showMergeButtons?: boolean;

	/** Let right-click-drag over a floating window's body pan the desktop. Default false. */
	mwiPanFromWindowBody?: boolean;

	/** Theme overrides. */
	theme?: ThemeOverrides;

	className?: string;
	style?: CSSProperties;

	/** Rendered above the frame area. */
	topBar?: ReactNode;

	/** Rendered below the frame area. */
	statusBar?: ReactNode;
}


/** Imperative API, mirroring the Vue version's `getContext()`. */
export interface WindowManagerHandle {
	getManager(): ReactWindowManager;
	loadLayout(layout: Layout): void;
	resetLayout(): void;
	getLayoutDetails(): Layout;
}


export const WindowManagerView = forwardRef<WindowManagerHandle, WindowManagerProps>(
	function WindowManagerView(props, ref) {

		const {
			availableWindows,
			defaultLayout = null,
			splitMergeHandles = true,
			keepEmptyFrames = false,
			showMergeButtons = false,
			mwiPanFromWindowBody = false,
			theme,
			className,
			style,
			topBar,
			statusBar,
		} = props;

		// One manager for the life of this component. Built through a ref rather than
		// useMemo because constructing it attaches a global pointer listener, and
		// useMemo makes no promise about how often it runs.
		const mgrRef = useRef<ReactWindowManager | null>(null);

		if (mgrRef.current === null) {
			mgrRef.current = new CoreWindowManager<WindowComponent>({
				availableWindows,
				defaultLayout,
			});
		}

		const mgr = mgrRef.current;

		const [penEl, setPenEl] = useState<HTMLElement | null>(null);
		const containerElRef = useRef<HTMLDivElement | null>(null);

		// keep the registry in step with the prop
		useEffect(() => {
			if (availableWindows !== undefined)
				mgr.availableWindowList.setAvailableWindows(availableWindows);
		}, [mgr, availableWindows]);

		useEffect(() => {
			mgr.showBlenderSplitMergeHandles.value = splitMergeHandles;
		}, [mgr, splitMergeHandles]);

		useEffect(() => {
			mgr.keepEmptyFrames.value = keepEmptyFrames;
		}, [mgr, keepEmptyFrames]);

		useEffect(() => {
			mgr.showMergeButtons.value = showMergeButtons;
		}, [mgr, showMergeButtons]);

		useEffect(() => {
			mgr.mwiPanFromWindowBody.value = mwiPanFromWindowBody;
		}, [mgr, mwiPanFromWindowBody]);

		// hand the manager its container, and watch it for size changes.
		//
		// StrictMode runs this mount/unmount/mount in development. setContainerEl is
		// idempotent (it only builds a layout when there isn't one), which is what stops
		// the classic "every frame appears twice in dev" bug.
		const attachContainer = useCallback((el: HTMLDivElement | null) => {

			containerElRef.current = el;

			if (el !== null)
				mgr.setContainerEl(el);
			else
				mgr.unsetContainerEl();

		}, [mgr]);

		useEffect(() => {

			const el = containerElRef.current;
			if (el === null)
				return;

			const observer = new ResizeObserver(() => mgr.onContainerResize());
			observer.observe(el);

			return () => observer.disconnect();

		}, [mgr]);

		// release the manager's global listeners with the component
		useEffect(() => {
			return () => mgr.destroy();
		}, [mgr]);

		useImperativeHandle(ref, () => ({
			getManager: () => mgr,
			loadLayout: (layout: Layout) => mgr.loadLayout(layout),
			resetLayout: () => mgr.resetLayout(),
			getLayoutDetails: () => mgr.getLayoutDetails(),
		}), [mgr]);

		const frames = useReactive(() => mgr.framesRef.value);
		const windows = useReactive(() => mgr.windowsRef.value);

		const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

		const contextValue = useMemo(() => ({ mgr, penEl }), [mgr, penEl]);

		const inset = `${topBar ? 38 : 1}px 1px ${statusBar ? 28 : 1}px 1px`;

		return (
			<WindowManagerContext.Provider value={contextValue}>
				<MenuProvider>
				<div
					className={`windowManager${className ? ` ${className}` : ''}`}
					style={{ ...cssVars, ...style } as CSSProperties}
				>
					{topBar != null && <div className="topBar">{topBar}</div>}

					<div className="windowingSystemWrapper" style={{ inset }}>
						<div className="windowFrameContainer" ref={attachContainer}>
							{frames.map(frame => (
								<WindowFrameView key={frame.frameID} frame={frame} />
							))}

							{/* sits inside the frame container so its coordinates are
							    the same ones the core's hit testing works in */}
							<WindowDragLayer />
						</div>
					</div>

					{statusBar != null && <div className="statusBar">{statusBar}</div>}

					{/* windows live here until a frame slot claims them */}
					<div className="thePen" ref={setPenEl} />

					{windows.map(win => (
						<WindowHost key={win.windowID} window={win} penEl={penEl} />
					))}
				</div>
				</MenuProvider>
			</WindowManagerContext.Provider>
		);
	},
);
