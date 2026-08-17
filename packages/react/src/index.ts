/*
	index.ts
	--------

	Public surface of react-win-mgr.

	Import the stylesheet separately:

		import 'react-win-mgr/styles.css';
*/

import './styles.scss';

export { WindowManagerView, type WindowManagerProps, type WindowManagerHandle } from './WindowManagerView';
export { WindowFrameView } from './WindowFrameView';
export { WindowHost } from './WindowHost';
export { TabStrip, SingleTitleBar } from './TabStrip';
export { WindowDragLayer } from './WindowDragLayer';
export { MwiSurface } from './MwiSurface';
export { EmptyFrameMenu } from './EmptyFrameMenu';
export { MenuProvider, useMenu, type MenuItem } from './Menu';
export { buildFrameMenu } from './frameMenus';

export {
	useWindowManager,
	useWindowManagerContext,
	useWindow,
	useFrame,
	WindowManagerContext,
	WindowContext,
	FrameContext,
	type WindowComponent,
	type ReactWindowManager,
	type ReactWindowFrame,
	type ReactWindow,
} from './context';

export { useReactive, useSignal } from './useReactive';
export { defaultThemeColors, themeToCssVars, type ThemeColors, type ThemeOverrides } from './theme';

// re-export the pieces of the core a consumer needs to author layouts
export {
	FRAME_STYLE,
	SPLIT_MODE,
	EDGE,
	type Layout,
	type LayoutFrameDef,
	type FrameStyle,
	type Edge,
} from '@win-mgr/core';
