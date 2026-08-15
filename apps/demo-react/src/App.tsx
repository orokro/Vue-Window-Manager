/*
	App.tsx
	-------

	The demo shell: a manager, four window kinds, and a starting layout.

	The layout is authored in a notional 1920x1080 space with references between named
	frames - exactly the format the Vue version uses, because it's the core doing the
	parsing in both cases.
*/

import { useRef } from 'react';
import { WindowManagerView, FRAME_STYLE, type Layout, type WindowManagerHandle } from 'react-win-mgr';
import { CanvasWindow, CounterWindow, NotesWindow, ReadmeWindow } from './windows';
import './demo.scss';


const availableWindows = [
	{ window: ReadmeWindow, slug: 'readme', title: 'Read Me' },
	{ window: NotesWindow, slug: 'notes', title: 'Notes' },
	{ window: CounterWindow, slug: 'counter', title: 'Counter' },
	{ window: CanvasWindow, slug: 'canvas', title: 'Canvas' },
];


const layout: Layout = [
	{
		name: 'window',
		top: 0, left: 0, bottom: 1080, right: 1920,
	},
	{
		// a tabbed frame with several tabs, to exercise reordering and tear-off
		name: 'main',
		style: FRAME_STYLE.TABBED,
		windows: ['readme', 'notes', 'counter', 'canvas'],
		left: 0,
		right: ['ref', 'window.right-620'],
		top: 0,
		bottom: ['ref', 'window.bottom-380'],
	},
	{
		name: 'lowerLeft',
		style: FRAME_STYLE.SINGLE,
		windows: ['notes'],
		left: 0,
		right: ['ref', 'main.right'],
		top: ['ref', 'main.bottom'],
		bottom: ['ref', 'window.bottom'],
	},
	{
		// a second tabbed frame, so torn windows have somewhere to be dropped
		name: 'sideTop',
		style: FRAME_STYLE.TABBED,
		windows: ['counter', 'canvas'],
		left: ['ref', 'main.right'],
		right: ['ref', 'window.right'],
		top: 0,
		bottom: ['ref', 'main.bottom'],
	},
	{
		name: 'sideBottom',
		style: FRAME_STYLE.SINGLE,
		windows: ['canvas'],
		left: ['ref', 'main.right'],
		right: ['ref', 'window.right'],
		top: ['ref', 'main.bottom'],
		bottom: ['ref', 'window.bottom'],
	},
];


export function App(): JSX.Element {

	const mgrRef = useRef<WindowManagerHandle | null>(null);

	return (
		<WindowManagerView
			ref={mgrRef}
			availableWindows={availableWindows}
			defaultLayout={layout}
			topBar={
				<div className="demoTopBar">
					<strong>react-win-mgr</strong>
					<span className="sep" />
					<button type="button" onClick={() => mgrRef.current?.resetLayout()}>
						Reset layout
					</button>
					<button
						type="button"
						onClick={() => console.log(JSON.stringify(mgrRef.current?.getLayoutDetails(), null, 2))}
					>
						Log layout
					</button>
				</div>
			}
			statusBar={<span>drag borders to resize &middot; drag corner handles to split / merge</span>}
		/>
	);
}
