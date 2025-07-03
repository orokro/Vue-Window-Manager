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

		this.id = window.id;

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

		// find the frame we live in...
		const frame = this.#windowManager.getFrameFromWindow(this.#window);

		// nothing to close if window doesn't belong to a frame
		if(frame==null)
			return;

		// remove the window from the frame
		frame.removeWindow(this.#window, { noMerge: true });
	}

}
