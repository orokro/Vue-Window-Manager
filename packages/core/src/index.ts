/*
	index.ts
	--------

	Public surface of the framework-agnostic core.

	Nothing in here imports a UI framework. A renderer binding (react-win-mgr,
	vue-win-mgr, ...) consumes these classes, subscribes to their signals, and is
	responsible for turning `frame.screenPos` into pixels and for parenting each
	window's content into `window.domContainer`.
*/

// reactivity
export {
	signal,
	effect,
	computed,
	batch,
	untracked,
	reactive,
	type Signal,
	type ReadonlySignal,
} from './signal';

// core classes
export { WindowManager, type WindowManagerOptions, type SplitFillMode, type SplitModeDetails, type DropSide } from './WindowManager';
export { WindowFrame, type WindowFrameOptions, type RemoveWindowOptions } from './WindowFrame';
export { Window, type WindowPosition, type WindowSize } from './Window';
export { EdgeMap, type EdgeEntry, type PreferredPositionsCache } from './EdgeMap';
export {
	WindowDragSystem,
	type DropRegion,
	type DropTarget,
	type DragOperation,
	type DropPreview,
} from './WindowDragSystem';
export { WindowLayoutHelper } from './WindowLayoutHelper';
export { AvailableWindowList } from './AvailableWindowList';
export { DragHelper, type DragHandlers, type DragToken, type Point } from './DragHelper';

// constants & types
export {
	FRAME_STYLE,
	SPLIT_MODE,
	EDGE,
	EDGE_NEIGHBOR_STATUS,
	EDGE_ORIENTATION,
	type FrameStyle,
	type SplitMode,
	type Edge,
	type EdgeNeighborStatus,
	type EdgeOrientation,
	type EdgeRect,
	type PartialEdgeRect,
	type FrameDimensions,
	type WindowDescriptor,
	type WindowDescriptorInput,
	type Layout,
	type LayoutFrameDef,
	type LayoutValue,
	type LayoutWindowEntry,
} from './types';

// helpers worth sharing with renderers
export { clamp, clamp01, rangeOverlap, closestWithClass, RANGE_OVERLAP, type RangeOverlap } from './utils';
