/*
	WindowContext.js
	----------------

	Like WindowManagerContext.js, and WindowFrameContext.js,
	this file provides some functionality for the library user to
	work with individual windows.

	Again, this is super limited, and only provides limited functionality.x

	It main exists as a way to hide the internal implementation details,
	and provide just a simple API for useful things.
*/

// vue
import { watch } from "vue";

import Window from "./Window";
import WindowLayoutHelper from "./WindowLayoutHelper";
import WindowManager from "./WindowManager";

export default class WindowContext {

	#window = null;
	#refs = {};
	#windowManager = null;

	/**
	 * Constructs a new WindowContext.
	 *
	 * @param {Window} window - the window we're the context for
	 * @param {Object} refs - a reference to the Vue component's refs, if needed
	 */
	constructor(window, refs) {

		// save our private things
		this.#window = window;
		this.#refs = refs;

		this.id = window.windowID;

		// break out window manager
		this.#windowManager = this.#window.mgr;
	}


	/**
	 * Helper to get the window Title.
	 * **
	 * @returns {String} - the unique ID of the window
	 */
	getTitle() {

		// return the title of the window
		return this.#window.title;
	}


	/**
	 * Sets the title of the window.
	 *
	 * @param {String} title - the title to set for the window
	 */
	setTitle(title) {

		// set the title of the window
		this.#window.title = title;

		// update the title reference
		this.#window.titleRef.value = title;
	}


	/**
	 * closes this window
	 */
	close(){

		// simply forward to the window's close method
		this.#window.close();
	}


	/**
	 * Sets the kind of the window. (i.e. the slug)
	 *
	 * @param {String} kind - window kind slug to set
	 */
	setKind(kind) {

		// update the title reference
		this.#window.setWindowKind(kind);
	}


	/**
	 * Gets the live WindowFrameContext for the frame this window currently lives in.
	 *
	 * Unlike a cached frame context, this always resolves the window's _current_ frame,
	 * so it stays correct after the window is dragged/docked to another frame.
	 *
	 * @returns {WindowFrameContext|null} - the current frame's context, or null if undocked
	 */
	getFrame() {

		// resolve via the window's reactive frame reference
		const frame = this.#window.frameRef.value;
		return (frame != null) ? frame.frameContext : null;
	}


	/**
	 * Subscribe to be notified whenever this window is moved to a different frame.
	 *
	 * Useful for window-components that need to react when they're re-docked.
	 *
	 * @param {Function} callback - called as (newFrameContext, oldFrameContext) on each move
	 * @returns {Function} - a stop handle; call it to unsubscribe
	 */
	onFrameChange(callback) {

		// watch the reactive frame reference & forward the contexts (not raw frames)
		return watch(this.#window.frameRef, (newFrame, oldFrame) => {
			callback(
				(newFrame != null) ? newFrame.frameContext : null,
				(oldFrame != null) ? oldFrame.frameContext : null
			);
		});
	}


	/**
	 * Registers a callback that returns JSON-safe "rider" data to persist with the layout.
	 *
	 * Called during layout serialization; whatever it returns is stored alongside this
	 * window in the saved layout and handed back to onLayoutLoad when the layout is restored.
	 *
	 * @param {Function} callback - returns a JSON-safe object describing this window's state
	 */
	onSerialize(callback) {

		// stash the hook on the window for WindowLayoutHelper.getLayoutObject to call
		this.#window.serializeHook = callback;
	}


	/**
	 * Registers a callback that receives previously-serialized rider data on layout load.
	 *
	 * If this window was created from a saved layout that carried rider data, the callback
	 * fires immediately (now, as the component registers it) with that data. Otherwise it
	 * simply stays registered for completeness. This timing means it doesn't matter that the
	 * window manager mounts before the rest of the app's state is ready.
	 *
	 * @param {Function} callback - receives the previously-saved data object
	 */
	onLayoutLoad(callback) {

		// remember the hook
		this.#window.loadHook = callback;

		// if we have pending restore data, hand it over now & clear it
		if (this.#window.restoreData != null) {
			const data = this.#window.restoreData;
			this.#window.restoreData = null;
			callback(data);
		}
	}

}

