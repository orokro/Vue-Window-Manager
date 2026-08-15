/*
	WindowLayoutHelper.ts
	---------------------

	Reads and writes layouts.

	A layout is an array of frame definitions. One entry may be named "window" and
	defines the notional coordinate space everything else is expressed in - the numbers
	are only ever ratios in disguise, because EdgeMap normalises the whole thing to
	fractions the moment it's loaded. Authoring in 1920x1080 and running at 800x600
	works fine.

	Edges can be literal pixels, a percentage, or a reference to another named frame's
	edge with optional arithmetic:

		top:    0
		right:  ['val', 50, '%']
		left:   ['ref', 'MainEditor.right']
		bottom: ['ref', 'window.bottom-300']

	References resolve against entries that appear EARLIER in the array. There is no
	second pass, so forward references don't work - that's a property of the original
	format and is preserved here deliberately so existing layouts keep loading.
*/

import { FRAME_STYLE, type FrameStyle, type Layout, type LayoutFrameDef, type LayoutValue, type LayoutWindowEntry } from './types';
import type { Window } from './Window';
import type { WindowManager } from './WindowManager';


/** A resolved rect during layout parsing. */
interface ParsedRect {
	top: number;
	bottom: number;
	left: number;
	right: number;
}


/** The default coordinate space when a layout doesn't declare one. */
const DEFAULT_WINDOW_SPACE: ParsedRect = { top: 0, left: 0, bottom: 1080, right: 1920 };


export class WindowLayoutHelper {

	/**
	 * Loads the manager's configured layout, or a reasonable built-in one.
	 *
	 * @param mgr - the manager to populate
	 */
	static loadDefaultLayout<T>(mgr: WindowManager<T>): void {

		if (mgr.defaultLayout !== null) {
			WindowLayoutHelper.loadLayout(mgr.defaultLayout, mgr);
			return;
		}

		// a plain three-panel arrangement: big editor, strip beneath it, tools on the right
		const builtIn: Layout = [
			{
				name: 'window',
				top: 0, left: 0, bottom: 1080, right: 1920,
			},
			{
				name: 'MainEditor',
				style: FRAME_STYLE.SINGLE,
				windows: [],
				left: 0,
				right: ['ref', 'window.right-330'],
				top: 0,
				bottom: ['ref', 'window.bottom-300'],
			},
			{
				name: 'debug',
				style: FRAME_STYLE.TABBED,
				windows: [],
				left: 0,
				right: ['ref', 'MainEditor.right'],
				top: ['ref', 'MainEditor.bottom'],
				bottom: ['ref', 'window.bottom'],
			},
			{
				name: 'tools',
				style: FRAME_STYLE.TABBED,
				windows: [],
				left: ['ref', 'MainEditor.right'],
				right: ['ref', 'window.right'],
				top: 0,
				bottom: ['ref', 'window.bottom'],
			},
		];

		WindowLayoutHelper.loadLayout(builtIn, mgr);
	}


	/**
	 * Builds frames and windows from a layout definition.
	 *
	 * @param layout - the layout array
	 * @param mgr - the manager to populate
	 */
	static loadLayout<T>(layout: Layout, mgr: WindowManager<T>): void {

		const refCache: Record<string, ParsedRect> = {};

		// the coordinate space everything else is measured against
		const spaceDef = layout.find(entry => entry?.name?.toLowerCase?.() === 'window');

		refCache['window'] = (spaceDef !== undefined)
			? {
				top: WindowLayoutHelper.readValue(spaceDef.top, refCache, DEFAULT_WINDOW_SPACE.bottom),
				bottom: WindowLayoutHelper.readValue(spaceDef.bottom, refCache, DEFAULT_WINDOW_SPACE.bottom),
				left: WindowLayoutHelper.readValue(spaceDef.left, refCache, DEFAULT_WINDOW_SPACE.right),
				right: WindowLayoutHelper.readValue(spaceDef.right, refCache, DEFAULT_WINDOW_SPACE.right),
			}
			: { ...DEFAULT_WINDOW_SPACE };

		const space = refCache['window'];

		// resolve every frame definition to concrete numbers first...
		const resolved: Array<{ pos: ParsedRect; style: FrameStyle; windows: LayoutWindowEntry[] }> = [];

		for (const def of layout) {

			if (def?.name?.toLowerCase?.() === 'window')
				continue;

			const pos: ParsedRect = {
				top: WindowLayoutHelper.readValue(def.top, refCache, space.bottom),
				bottom: WindowLayoutHelper.readValue(def.bottom, refCache, space.bottom),
				left: WindowLayoutHelper.readValue(def.left, refCache, space.right),
				right: WindowLayoutHelper.readValue(def.right, refCache, space.right),
			};

			resolved.push({
				pos,
				style: def.style ?? FRAME_STYLE.TABBED,
				windows: def.windows ?? [],
			});

			// named frames become referenceable by later entries
			if (def.name != null)
				refCache[def.name] = pos;
		}

		// ...then create everything in one go
		for (const entry of resolved) {

			const frame = mgr.addWindowFrame(
				{ t: entry.pos.top, b: entry.pos.bottom, l: entry.pos.left, r: entry.pos.right },
				false,
				{ frameStyle: entry.style },
			);

			for (const windowEntry of entry.windows) {

				const isObject = (typeof windowEntry === 'object' && windowEntry !== null);
				const kind = isObject ? windowEntry.kind : windowEntry;
				const props = (isObject ? windowEntry.props : undefined) ?? {};

				if (kind == null)
					continue;

				const win = mgr.createWindow(kind, props);

				// stash any rider state for the component's onLayoutLoad hook to claim
				const state = isObject ? windowEntry.state : undefined;
				if (state !== undefined && state !== null)
					win.restoreData = state;

				frame.addWindow(win);
			}

			// a tabbed frame should open showing something
			if (frame.currentTab.peek() === null && frame.windows.length > 0)
				frame.currentTab.value = frame.windows[0].windowID;
		}

		// everything is currently in the layout's own coordinate space - normalise it
		mgr.edgeMap.computeFrameLayout();
	}


	/**
	 * Resolves one edge value from a layout definition.
	 *
	 * @param value - a number, a ['val', n, unit] tuple, or a ['ref', 'Name.edge±n'] tuple
	 * @param refs - previously-resolved named rects
	 * @param max - the extent a percentage is measured against
	 */
	static readValue(value: LayoutValue, refs: Record<string, ParsedRect>, max: number): number {

		// bare number means pixels
		if (typeof value === 'number')
			return value;

		if (!Array.isArray(value))
			return 0;

		if (value[0] === 'val') {

			const raw = value[1] as number;
			return (value[2] === '%') ? Math.round((raw / 100) * max) : raw;
		}

		// otherwise it's a reference, possibly with a single + or - offset
		const expression = String(value[1]);
		const dotIndex = expression.indexOf('.');

		if (dotIndex < 0)
			return 0;

		const refName = expression.slice(0, dotIndex);
		const remainder = expression.slice(dotIndex + 1);

		const match = /^([a-zA-Z]+)\s*(?:([+-])\s*(\d+))?$/.exec(remainder);

		if (match === null)
			return 0;

		const target = refs[refName];
		if (target === undefined) {
			console.warn(`[win-mgr] layout references unknown frame "${refName}"`);
			return 0;
		}

		const key = match[1] as keyof ParsedRect;
		let result = target[key] ?? 0;

		if (match[2] !== undefined && match[3] !== undefined) {
			const offset = parseInt(match[3], 10);
			result += (match[2] === '+') ? offset : -offset;
		}

		return result;
	}


	/**
	 * Serialises one window, collapsing to a bare slug when there's nothing else to say.
	 *
	 * @param win - the window to serialise
	 * @returns a slug string, or a { kind, props, state } object
	 */
	static serializeWindow<T>(win: Window<T>): LayoutWindowEntry {

		let state: unknown;

		if (typeof win.serializeHook === 'function') {

			// validate JSON-safety now, so a bad payload fails loudly at save time
			// rather than silently corrupting a layout the user thinks they saved
			try {
				state = JSON.parse(JSON.stringify(win.serializeHook()));
			} catch (e) {
				throw new Error(
					`[win-mgr] onSerialize for window "${win.windowSlug}" returned non-JSON-safe data: ${(e as Error).message}`,
				);
			}
		}

		const hasProps = win.props != null && Object.keys(win.props).length > 0;
		const slug = win.windowSlug ?? '';

		if (state === undefined && !hasProps)
			return slug;

		const out: LayoutWindowEntry = { kind: slug, props: win.props ?? {} };

		if (state !== undefined)
			out.state = state;

		return out;
	}


	/**
	 * Captures the current arrangement as a layout that `loadLayout` can restore.
	 *
	 * @param mgr - the manager to read
	 */
	static getLayoutObject<T>(mgr: WindowManager<T>): Layout {

		const { width, height } = mgr.getContainerSize();

		const layout: Layout = [
			{ name: 'window', top: 0, left: 0, bottom: height, right: width },
		];

		for (const frame of mgr.frames) {

			const { t, b, l, r } = frame.screenPos.peek();

			layout.push({
				name: frame.frameID,
				style: frame.frameStyle.peek(),
				windows: frame.windows.map(win => WindowLayoutHelper.serializeWindow(win)),
				top: t,
				bottom: b,
				left: l,
				right: r,
			} satisfies LayoutFrameDef);
		}

		return layout;
	}
}
