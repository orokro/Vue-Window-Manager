# react-win-mgr

A Blender-style tiling window manager for React. Frames split, merge and resize with
no gaps and no overlaps — and windows keep their DOM alive when they move.

> Status: early. The layout engine works; tabs, floating windows and drag-between-frames
> are not implemented yet.

```sh
npm install react-win-mgr
```

```tsx
import { WindowManagerView, FRAME_STYLE, type Layout } from 'react-win-mgr';
import 'react-win-mgr/styles.css';

const availableWindows = [
	{ window: Notes, slug: 'notes', title: 'Notes' },
	{ window: Preview, slug: 'preview', title: 'Preview' },
];

const layout: Layout = [
	{ name: 'window', top: 0, left: 0, bottom: 1080, right: 1920 },
	{
		name: 'main',
		style: FRAME_STYLE.SINGLE,
		windows: ['notes'],
		top: 0, left: 0,
		right: ['ref', 'window.right-400'],
		bottom: ['ref', 'window.bottom'],
	},
	{
		name: 'side',
		style: FRAME_STYLE.SINGLE,
		windows: ['preview'],
		top: 0,
		left: ['ref', 'main.right'],
		right: ['ref', 'window.right'],
		bottom: ['ref', 'window.bottom'],
	},
];

export function App() {
	return <WindowManagerView availableWindows={availableWindows} defaultLayout={layout} />;
}
```

## Layouts

Frame edges are pixels, percentages, or references to another **earlier** frame's edge
with optional `+n` / `-n`:

```js
top:    0
right:  ['val', 50, '%']
left:   ['ref', 'main.right']
bottom: ['ref', 'window.bottom-300']
```

The numbers are ratios in disguise — the whole layout is normalised to fractions of the
real container on load, so authoring in 1920×1080 and running at any size works.

## Imperative API

```tsx
const ref = useRef<WindowManagerHandle>(null);

ref.current.getLayoutDetails();   // serialisable layout
ref.current.loadLayout(saved);
ref.current.resetLayout();
ref.current.getManager();         // the core WindowManager, for anything else
```

## Interaction

- **Resize** — drag any border. Every edge colinear with it moves too, so a divider
  shared by frames of different heights stays a straight line.
- **Split** — drag *inward* from a corner handle, then click to place the cut.
- **Merge** — drag *outward* from a corner handle toward the neighbour to absorb.
- Reversing direction mid-drag swaps between the two.

## Why windows don't remount

React's `createPortal` unmounts and rebuilds its subtree when you change the container,
which would reset a window every time it moved. Each window here gets one host element
that lives as long as the window does; docking re-parents *that element* rather than
re-pointing the portal. Canvas contents, uncontrolled inputs, iframes and component
state all survive.

## Theming

~30 CSS custom properties on the root element. Pass a `theme` prop, or override
`--theme-*` from your own CSS.

```tsx
<WindowManagerView theme={{ frameBGColor: '#1e1e28', windowBGColor: '#fafafa' }} ... />
```

## Related

Built on [`@win-mgr/core`](../core), which has no framework dependency — the geometry,
adjacency and layout serialisation all live there.

MIT · Greg Miller
