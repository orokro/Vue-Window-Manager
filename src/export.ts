/*
	export.ts
	---------

	defines exports for library	use
*/

// get the main component to export
import WindowManager from './components/WindowManager.vue';

// we'll want to export the frame styles, but not he class itself:
import WindowFrame from './classes/WindowFrame';
const FRAME_STYLE = WindowFrame.STYLE;

// we'll export the context classes, for reference & type use,
// but users probably never need to instantiate these directly:
import WindowManagerContext from './classes/WindowManagerContext';
import WindowFrameContext from './classes/WindowFrameContext';
import WindowContext from './classes/WindowContext';

// composables a window-component can use to persist & restore its own state across layout saves
import { onSerialize, onLayoutLoad } from './hooks/useWindowSerialization';

export {
	WindowManager,
	FRAME_STYLE,
	WindowManagerContext,
	WindowFrameContext,
	WindowContext,
	onSerialize,
	onLayoutLoad
};
export default WindowManager;
