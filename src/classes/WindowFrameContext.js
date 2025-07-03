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

import WindowContext from "./WindowContext";
import WindowFrame from "./WindowFrame";
import WindowLayoutHelper from "./WindowLayoutHelper";
import WindowManager from "./WindowManager";

export default class WindowFrameContext {

	#windowFrame = null;
	#refs = {};
	#windowManager = null;

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

		// break out window manager
		this.#windowManager = this.#windowFrame.mgr;
	}


	/**
	 * For demo
	 */
	printFrame(){
		console.log("Printing from WindowFrameContext");
		console.log(this.#windowFrame)
	}	


	/**
	 * Adds a window to the frame...
	 * 
	 * ... either a tab if it's tabbed, a MWI if it's MWI, or replace the current window
	 * @param {String} slug - the slug of the window to add
	 */
	addWindow(slug){

		// get array of valid slugs
		const availableSlugs = this.getAvailableWindowKinds();

		// GTFO & error if it's not present
		if (!availableSlugs.includes(slug)) {
			throw new Error(`Window slug "${slug}" is not available in this frame.`);
		}

		// make a new window w/ our slug
		const window = this.#windowManager.createWindow(slug);

		// add it to our frame
		this.#windowFrame.addWindow(window);
	}
	

	/**
	 * Returns kinds to user
	 * 
	 * @returns {Array<String>} - an array of the available window slugs
	 */
	getAvailableWindowKinds(){
		return this.#windowManager.availableWindowList.getAvailableWindowKinds();
	}


	/**
	 * Let's user get the current frame's dimensions
	 * 
	 * @returns {Object} - an object like {top, bottom, left, right, width, height}
	 */
	getFrameDimensions() {
		return this.#windowFrame.getFrameDim();
	}


	/**
	 * Gets all the window contexts in the frame.
	 * 
	 * @returns {Array<WindowContext>} - an array of WindowContext objects for each window in the frame
	 */
	getWindows(){

		const windows = [...this.#windowFrame.windows];
		const windowContexts = windows.map((window) => {
			return window.ctx;
		});

		return windowContexts;
	}


	/**
	 * Closes all the windows in this frame
	 */
	closeAllWindows(){

		// close all windows in the frame
		this.#windowFrame.closeAllWindows();
	}


	/**
	 * Sets the frame type for the frame
	 * 
	 * @param {String|Number} newType - either the raw value from WindowFrame.STYLE constants, or either a number, or string like "10" or "TABBED"
	 */
	setFrameStyle(newType) {

        // get the valid styles, from static object:
        const styleValues = Object.values(WindowFrame.STYLE);
        const styleKeys = Object.keys(WindowFrame.STYLE);

        // if new type is not a string or a number, throw an error
        if (typeof newType !== 'string' && typeof newType !== 'number') {
            throw new Error(`Invalid frame style type: ${typeof newType}. Must be a string or number.`);
        }

        // if it's a string, process it
        if (typeof newType === 'string') {

            // Check if it's a numeric string
            if (!isNaN(newType)) {
                newType = parseInt(newType, 10);

            } else {

                // Convert to uppercase and check if it's a valid key
                newType = newType.toUpperCase();
                if (!styleKeys.includes(newType)) {
                    throw new Error(`Invalid frame style key: ${newType}. Must be one of ${styleKeys.join(', ')}.`);
                }

                // Convert the key to its corresponding value
                newType = WindowFrame.STYLE[newType];
            }
        }

        // if it's a number, check if it's a valid value
        if (typeof newType === 'number' && !styleValues.includes(newType)) {
            throw new Error(`Invalid frame style value: ${newType}. Must be one of ${styleValues.join(', ')}.`);
        }

        // Set the frame style
        this.#windowFrame.frameStyle.value = newType;
    }

	/**
	 * Gets the current frame style as an object like {styleName, styleValue}
	 * 
	 * @return {Object} - an object with the styleName and styleValue
	 */
	getFrameStyle(){
		const styleValue = this.#windowFrame.frameStyle.value;
		const styleName = Object.keys(WindowFrame.STYLE).find(key => WindowFrame.STYLE[key] === styleValue);

		return {
			styleName: styleName,
			styleValue: styleValue
		};
	}

}
