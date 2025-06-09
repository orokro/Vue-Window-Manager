/*
	WindowFrameContext.js
	---------------------

	Like the WindowManagerContext.js, this file provides some functionality for
	window frames that the library user can access.

	It doesn't provide access to the entire internal workings of the WindowFrame / library,
	because I don't want to document all that or formalize it as an API.

	This, this file will be the API for the WindowFrame component,
	so the user can have some control over the WindowFrame.

	In the future, this can be expanded to include more functionality as needed.
*/

import WindowFrame from "./WindowFrame";
import WindowLayoutHelper from "./WindowLayoutHelper";
import WindowManager from "./WindowManager";

export default class WindowFrameContext {

	#windowFrame = null;
	#refs = {};

	/**
	 * Constructs a new WindowFrameContext.
	 * 
	 * @param {WindowFrame} windowFrame - the window frame we're the context for
	 * @param {Object} refs - a reference to the Vue component's refs, if needed
	 */
	constructor(windowFrame, refs) {

		// save our private things
		this.#windowFrame = windowFrame;
		this.#refs = refs;
	}


	/**
	 * For demo
	 */
	printFrame(){
		console.log("Printing from WindowFrameContext");
		console.log(this.#windowFrame)
	}	
}
