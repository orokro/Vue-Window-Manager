/*
	WindowManagerContext.js
	-----------------------

	This file is what is returned when a user has access to the WindowManager component
	& calls .getContext(), like:

	<WindowManager ref="windowMgrEl">

	// ... later ...
	const windowMgrEl = ref(null);

	// ctx will be what this file/class defines
	const ctx = windowMgrEl.value.getContext();

	------------------------

	This object is not directly needed or consumed by the Window manager system,
	but is basically an API bridge for the WindowManager component,
	so the user can have some control over the WindowManager.

	For now, this will be a simple implementation, but if the library
	is popular or needs more features, this can be expanded in the future.
*/

import WindowManager from "./WindowManager";
import WindowLayoutHelper from "./WindowLayoutHelper";

export default class WindowManagerContext {

	#windowManager = null;
	#refs = {};

	/**
	 * Constructs a new WindowManagerContext.
	 * 
	 * @param {WindowManager} windowManager - the window manager we're the context for
	 * @param {Object} refs - a reference to the Vue component's refs, if needed
	 */
	constructor(windowManager, refs) {

		// save our private things
		this.#windowManager = windowManager;
		this.#refs = refs;
	}


	/**
	 * Shows (or hides) the top bar
	 * 
	 * @param {Boolean} show - true if we should show the top bar, defaults to true
	 */
	showTopBar(show=true){

		this.#refs.showTopBar.value = show;
	}


	/**
	 * Shows (or hides) the bottom status bar
	 * 
	 * @param {Boolean} show - true if we should show the bottom bar, defaults to true
	 */
	showStatusBar(show=true){

		this.#refs.showStatusBar.value = show;
	}


	/**
	 * Shows (or hides) the split/merge handles
	 * 
	 * @param {Boolean} show - true if we should show the split/merge handles, defaults to true
	 */
	showSplitMergeHandles(show=true) {

		this.#refs.splitMergeHandles.value = show;
	}	
	

	/**
	 * Loads window layout
	 * 
	 * @param {Array<Object>} layout - array of window layout details
	 */
	loadLayout(layout){

		// clear current layout & load a new one
		this.#windowManager.clearWindowLayout();
		WindowLayoutHelper.loadLayout(layout, this.#windowManager);
	}


	/**
	 * Resets the layout to the saved or built-in default
	 */
	resetLayout(){

		// clear the layout that currently exists
		this.#windowManager.clearWindowLayout();

		// get potentially saved default layout from the window manager
		const defaultLayout = this.#windowManager.defaultLayout;

		// if we have a default layout, load it
		if(defaultLayout!=null){
			this.loadLayout(defaultLayout);
			return;
		}

		// otherwise, load the default layout
		WindowLayoutHelper.loadDefaultLayout(this.#windowManager);

	}


	/**
	 * If the user has added/removed, moved, split, or joined windows, this gets the current layout
	 * 
	 * It will be able to be loaded with loadLayout at a later time.
	 * @returns {Array<Object>} - the current layout details
	 */
	getLayoutDetails(){

		return WindowLayoutHelper.getLayoutObject(this.#windowManager)
	}

}
