/*
	WindowLayoutHelper.js
	---------------------

	This file helps with the serialization and deserialization
	of Window layouts.

	As described in the large comment-block on the top of WindowManager.js,
	Windows are placed in WindowFrames, that can be split, joined, dragged-&-dropped,
	and etc. Window frames can be tabbed, or MWI.

	Because we want the Application to start up with more than one window,
	we need a way of describing, saving, and loading Window Frame layouts,
	and the contents of said frames.

	This file provides some static method for doing that task.
*/

// classes
import WindowManager from "./WindowManager";
import WindowFrame from "./WindowFrame";
import Window from "./Window";

// the main money export
export default class WindowLayoutHelper {

	/**
	 * Loads the default, hard-coded layout
	 * @param {WindowManager} windowMgr - reference to a window manager
	 */
	static loadDefaultLayout(windowMgr) {

		// we'll just hardcode the layout here, and then call the generic loadLayout method

		/*	
			I'll use this multi-line comment to hold the spec for the layout object...

			The layout object is essentially an array of objects, where each object stores info on
			a window frame

			Windows Frames can optionally be named, which will only only be used for the layout helper, not
			in the rest of the application. Here's an example Window object:

			var layout = [
				{
					name: "Window",
					left: 0,
					right: 1920,
					top: 0,
					bottom: 1080
				},
				{
					name: "Toolbar",
					style: WindowFrame.STYLE.TABBED,
					windows: [ <Window.KIND>, ... ],
					left: ["val", 0, "px"],
					right: ["ref", "window.right"],
					top: ["val", 0, "%"],
					bottom: 32
				}
				...
			]

			What to notice in the above example:
			- the first entry is "Window"
			- the window entry is optional, but if it's omitted, all the rest of the calculations will assume 1920x1080
			- the window resolution doesn't "actually" matter, because the layout will be stretched/scaled/expanded/shrunk
			  to fit the current window after it's loaded anyway.
			- the window values can be thought of a hypothetical space the rest of the layout exists in
			- after the optional window settings, we add four first window frame
			- We gave it a name
			- We specified what kind of frame style this frame is (OPTIONAL, default is TABBED)
			- We gave it an array of windows to be loaded in that frame
			- the left, right, top values take arrays
			- the first key in the array is always a string that says "val" or "ref",
			- which determines if a raw value or a reference is being input
			- if its a value, the second key is the value
			- the third key is whether the value is specified in px or percentage
			- if it's a "ref", then the second key is a string reference
			- window is defined automatically, but other named windows can be referenced
			- the bottom value does not take an array. In this case, it's assumed 32 means 32px.

			For example, another window that wants to share the bottom edge of Toolbar might be:

				{
					name: "MainScreen",
					windows: [ Window.KIND.Editor ],
					left: 0,
					right: ["ref", "window.right"],
					bottom: ["ref", "window.bottom"],
					top: ["ref", "Toolbar.bottom"]
				}

			So what just happened?

			We defined a window called MainScreen, with window Editor.
			it's left is assumed to be 0px.
			It references the windows right and bottom for its right and bottom
			And it's top is the the same as the Toolbars bottom.

			Now, hard-coded layouts can be more powerful than generated layouts, obvi.
			Generated layouts will just save each window with it's percentage positioning

			References can also do addition and subtraction, with the strict syntax:
			["ref", "window.right-150"]

			A single, positive, integer, can be added or subtracted at the end of a reference.

			NOTE: names are case-insensitive, and duplicate names may cause the layout to break!
		*/

		var defaultLayout = [

			{	// we'll build layout in hypothetical 1080P space
				name: "window",
				top: 0,
				left: 0,
				bottom: 1080,
				right: 1920
			},
			{
				// Main  editor:
				name: "MainEditor",
				windows: [Window.KIND.EDITOR],
				style: WindowFrame.STYLE.SINGLE,
				left: 0,
				right: ["ref", "window.right-330"],
				top: 0,
				bottom: ["ref", "window.bottom-300"]
			},
			{
				// debug view under main view
				name: "debug",
				windows: [Window.KIND.DEBUG],
				left: 0,
				style: WindowFrame.STYLE.TABBED,
				//left: ["ref", "VerticalToolBar.right"],
				right: ["ref", "MainEditor.right"],
				top: ["ref", "MainEditor.bottom"],
				bottom: ["ref", "window.bottom"]
			},
			{	// Tool palette, on right by default
				name: "tools",
				windows: [Window.KIND.TOOLS],
				style: WindowFrame.STYLE.TABBED,
				left: ["ref", "MainEditor.right"],
				right: ["ref", "window.right"],
				top: 0,
				bottom: ["ref", "window.bottom"]
			}
		];

		// now just our our regular load layout method
		WindowLayoutHelper.loadLayout(defaultLayout, windowMgr);
	}


	/**
	 * Loads a single app with a full screen layout.
	 * 
	 * Used for debug, etc.
	 * 
	 * @param {Number} windowKind - one of our Window.KIND constants
	 * @param {WindowManager} windowMgr - ref to the window manager
	 */
	static layoutSingleFrame(windowKind, windowMgr) {

		// build a layout that just full screens a single frame
		const singleAppLayout = [
			{	// single window frame that fills the window
				name: "single",
				style: WindowFrame.STYLE.TABBED,
				windows: [windowKind],
				left: 0,
				right: ["ref", "window.right"],
				top: 0,
				bottom: ["ref", "window.bottom"]
			},
		];

		// now just our our regular load layout method
		WindowLayoutHelper.loadLayout(singleAppLayout, windowMgr);
	}


	/**
	 * Load a layout
	 * 
	 * @param {Array<Object>} layout - a layout "object" (technically an array of objects)
	 * @param {WindowManager} windowMgr - ref to the window manager
	 */
	static loadLayout(layout, windowMgr) {

		// We're about to loop through the layout descriptions
		const refCache = {};

		// see if the layout provides an alternative window, but default a default window incase
		const windowFromLayout = layout.filter(i => i.name.toLowerCase() == "window")[0];
		const defaultWindow = {
			top: 0,
			left: 0,
			bottom: 1080,
			right: 1920
		};

		// set our default window size that other keys can reference
		refCache["window"] = (windowFromLayout === undefined) ? defaultWindow : windowFromLayout;

		// we'll also keep an array of window frame data as we go,
		// not just named frames, but all window frames
		var windowFrameData = [];

		// quick function to read a value
		const readValue = (value, refs, max) => {

			let val;

			// if the value is a number, we can just use it as-is (its assumed to be in pixels)
			if (typeof (value) === "number") {

				val = value;

				// check first key of array to see if we're dealing with a value or a reference
			} else if (value[0] == "val") {

				// value should always be the second key
				val = value[1];

				// if the third key is "%" then we need to convert the value
				// other wise can assume its in pixels
				if (value[2] == "%")
					val = parseInt((val / 100) * max);

				// otherwise, we're dealing with a reference, 
			} else {

				// get the reference string as array
				let ref = value[1].split('.');

				// get the object being referenced
				let refWnd = ref[0];

				// get the key keying referenced
				// note the double split magic, handles both the case that a + or 1 is appended
				let refKey = ref[1].split('+')[0].split('-')[0];

				// get the value from the reference
				console.log(refs, refWnd, refKey)
				val = refs[refWnd][refKey];

				// if anything was being added, lets add it now
				if (ref[1].split("+").length > 1)
					val += parseInt(ref[1].split("+")[1]);

				// if anything was being subtracted, lets subtract it now
				if (ref[1].split("-").length > 1)
					val -= parseInt(ref[1].split("-")[1]);
			}

			// return our value!
			return val;
		}


		// the layout should be an array.. let's loop over it and process each
		// window description into concrete window positions
		for (var i = 0; i < layout.length; i++) {

			// get the description
			var desc = layout[i];

			// if the name is is window, skip it, as it was already handled earlier
			if (desc.name == "window")
				continue;

			// create new window frame data and read in the info
			var newWindowFrameData = {
				windows: desc.windows,
				style: desc.style === undefined ? WindowFrame.STYLE.TABBED : desc.style,
				pos: {
					top: readValue(desc.top, refCache, refCache["window"].bottom),
					left: readValue(desc.left, refCache, refCache["window"].right),
					bottom: readValue(desc.bottom, refCache, refCache["window"].bottom),
					right: readValue(desc.right, refCache, refCache["window"].right)
				}
			};

			// save our window frame data
			windowFrameData.push(newWindowFrameData);

			// if this window has a name, save it in the reference cache
			if (!(typeof (desc.name) === 'undefined'))
				refCache[desc.name] = newWindowFrameData.pos;

		}//next i

		// now that we have a list of window frame data, lets loop over it an spawn all windows at once
		for (let i = 0; i < windowFrameData.length; i++) {

			// get the data
			const data = windowFrameData[i];
			const { windows, style } = data;
			const { top, left, bottom, right } = data.pos;

			// ask our window manager to make a new frame with these positions
			const newFrame = windowMgr.addWindowFrame(top, bottom, left, right, false);

			// set it's style
			newFrame.frameStyle.value = style;

			// add the windows from our list to this frame
			for (let w = 0; w < windows.length; w++) {

				const kind = windows[w];
				const newWindow = windowMgr.createWindow(kind);
				newFrame.addWindow(newWindow);

			}// next w

		}//next i	    

		// after all our windows are loaded, they're in an arbitrary coordinate system,
		// so we'll call this which will fit them to the IRL window space
		windowMgr.edgeMap.computeFrameLayout();
	}


	/**
	 * Generates a layout like the ones hard-coded. This way, someday we can serialize layouts to disk / documents, etc.
	 * 
	 * @param {WindowMgr} wndMgr - reference to a WindowManager (aka THE window manager)
	 */
	static getLayoutObject(wndMgr) {

		// TODO: implement :P

	}


	/**
	 * Save's a layout to the users disk as a preset
	 * 
	 * @param {Object} layout - layout object. Technically an Array I think? *shrugs*
	 */
	static saveLayout(layout) {

		// TODO: implement :P

	}

}// class
