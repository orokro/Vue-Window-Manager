/*
	context.ts
	----------

	React context carrying the WindowManager instance (and the pen element every window
	parks in before its frame slot exists) down the tree.

	The manager is a stable object created once; it never changes identity, so putting
	it in context costs nothing in re-renders. All the moving parts inside it are
	signals, which components subscribe to individually via useReactive.
*/

import { createContext, useContext } from 'react';
import type { WindowManager, Window, WindowFrame } from '@win-mgr/core';
import type { ComponentType } from 'react';


/** The component type the React binding stores in the window registry. */
export type WindowComponent = ComponentType<Record<string, unknown>>;

export type ReactWindowManager = WindowManager<WindowComponent>;
export type ReactWindowFrame = WindowFrame<WindowComponent>;
export type ReactWindow = Window<WindowComponent>;


export interface WindowManagerContextValue {

	/** The manager instance. */
	mgr: ReactWindowManager;

	/** Hidden element windows are parented into until a frame claims them. */
	penEl: HTMLElement | null;
}


export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);


/**
 * Reads the nearest window-manager context.
 *
 * @throws if called outside a <WindowManager>
 */
export function useWindowManagerContext(): WindowManagerContextValue {

	const ctx = useContext(WindowManagerContext);

	if (ctx === null)
		throw new Error('[react-win-mgr] this component must be rendered inside <WindowManager>');

	return ctx;
}


/** Convenience accessor for just the manager. */
export function useWindowManager(): ReactWindowManager {
	return useWindowManagerContext().mgr;
}


/** Context giving a window component a handle on itself. */
export const WindowContext = createContext<ReactWindow | null>(null);


/** The window a component is rendering inside, or null outside one. */
export function useWindow(): ReactWindow | null {
	return useContext(WindowContext);
}


/** Context giving a window component a handle on the frame it currently sits in. */
export const FrameContext = createContext<ReactWindowFrame | null>(null);


/** The frame a component is rendering inside, or null outside one. */
export function useFrame(): ReactWindowFrame | null {
	return useContext(FrameContext);
}
