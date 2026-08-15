/*
	types.ts
	--------

	Shared constants & types for the window-manager core.

	In the Vue original these lived as `static` members on WindowFrame. They're pulled
	out here so consumers can import them without dragging in the class, and so
	TypeScript can give them real union types.
*/


/** How a frame presents the windows it holds. */
export const FRAME_STYLE = {
	SINGLE: 0,
	TABBED: 10,
	MWI: 20,
} as const;

export type FrameStyle = (typeof FRAME_STYLE)[keyof typeof FRAME_STYLE];


/** Which axis a modal split operation is running on. */
export const SPLIT_MODE = {
	OFF: 0,
	HORIZONTAL: 10,
	VERTICAL: 20,
} as const;

export type SplitMode = (typeof SPLIT_MODE)[keyof typeof SPLIT_MODE];


/** The four edges of a frame. Values double as keys into position objects. */
export const EDGE = {
	LEFT: 'l',
	RIGHT: 'r',
	TOP: 't',
	BOTTOM: 'b',
} as const;

export type Edge = (typeof EDGE)[keyof typeof EDGE];


/** How one edge of a frame relates to whatever is on the other side of it. */
export const EDGE_NEIGHBOR_STATUS = {

	/** Not yet computed. */
	UNDETERMINED: 0,

	/** Flush against the container boundary - nothing to resize against. */
	EXTREMITY: 1,

	/** Shares a coordinate with other frames, but no single perfect partner. */
	PARTIAL: 2,

	/** Exactly one neighbour whose perpendicular span matches ours exactly. */
	ADJACENT: 3,

	/** Currently being dragged. Never stored on the frame; used for display only. */
	SELECTED: 4,
} as const;

export type EdgeNeighborStatus = (typeof EDGE_NEIGHBOR_STATUS)[keyof typeof EDGE_NEIGHBOR_STATUS];


export const EDGE_ORIENTATION = {
	VERTICAL: 0,
	HORIZONTAL: 1,
} as const;

export type EdgeOrientation = (typeof EDGE_ORIENTATION)[keyof typeof EDGE_ORIENTATION];


/** A rectangle in edge-key form. All four values are required. */
export interface EdgeRect {
	t: number;
	b: number;
	l: number;
	r: number;
}


/** A partial rectangle, for "update only these edges" calls. */
export type PartialEdgeRect = Partial<EdgeRect>;


/** A rectangle in the friendlier form the public API hands out. */
export interface FrameDimensions {
	top: number;
	bottom: number;
	left: number;
	right: number;
	width: number;
	height: number;
}


/**
 * A window kind the manager is allowed to spawn.
 *
 * `TComponent` is whatever the host framework calls a component - a Vue component
 * object, a React component function, a Svelte component class. The core never looks
 * inside it; it only ever hands it back to the renderer.
 */
export interface WindowDescriptor<TComponent = unknown> {
	window: TComponent;
	title: string;
	slug: string;
	icon: string;
}


/** The loose form callers may pass in for `availableWindows`. */
export type WindowDescriptorInput<TComponent = unknown> =
	| TComponent
	| ({ window: TComponent } & Partial<Omit<WindowDescriptor<TComponent>, 'window'>>);


/** One edge of one frame - the unit the edge map deals in. */
export interface EdgeRef {
	frame: import('./WindowFrame').WindowFrame;
	edge: Edge;
}


/** A value in a layout definition: raw px, a ['val', n, unit] tuple, or a ['ref', 'Name.edge±n'] tuple. */
export type LayoutValue =
	| number
	| readonly ['val', number, ('px' | '%')?]
	| readonly ['ref', string];


/** How a window is written inside a layout's `windows` array. */
export type LayoutWindowEntry =
	| string
	| {
		kind: string;
		props?: Record<string, unknown>;
		state?: unknown;
	};


/** One entry in a layout array. The entry named "window" defines the coordinate space. */
export interface LayoutFrameDef {
	name: string;
	style?: FrameStyle;
	windows?: LayoutWindowEntry[];
	top: LayoutValue;
	bottom: LayoutValue;
	left: LayoutValue;
	right: LayoutValue;
}

export type Layout = LayoutFrameDef[];
