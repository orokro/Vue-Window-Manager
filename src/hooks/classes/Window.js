/*
	Window.js
	---------

	This file will represent a single instance of an open Window.

	As mentioned in the large comment block on the top of WindowManager.js,
	Windows live inside of WindowFrames, which divide the screen up logically.

	Windows, when docked inherit the size of the frame they live in.

	But, if the window is in MWI it also maintains it's X/Y position.

	If a window is in pop-up mode, it will maintain it's size, but it's position will
	be determined by it's icon mode.
*/

// vue
import { reactive, ref } from 'vue';

// classes
import WindowFrame from './WindowFrame';
import WindowManager from './WindowManager';

// lib/misc
import { parseParams, applyKeys } from '../../misc/Utils';

// the main money - Window class export
export default class Window {

	// we'll use a static class variable to make unique Window ID's as they spawn
	static IDCounter = 0;

	/**
	 * Constructs a new Window.
	 * 
	 * @param {WindowManager} mgr - the WindowManager class that instantiated us
	 * @param {Number} kind - OPTIONAL; the view kind this window should render. Default is EMPTY.
	 */
	constructor(mgr, kind) {

		// give ourself a unique ID
		this.windowID = `window_${Window.IDCounter++}`;

		// save our initial references to our manager
		this.mgr = mgr;

		// save a string we can test against later
		this.typeName = 'Window';

		// we'll store the position and size of the window on the window object,
		// but note that these values are only used when the window is placed in a "MWI" frame
		this.position = reactive({
			x: null,
			y: null,
			z: null,
		});
		this.size = reactive({
			width: 640,
			height: 480
		});

		// the dom container we'll mount our actual window contents to
		// when windows are moved around from frame-to-frame
		// null when not in use
		this.domContainer = ref(null);

		// we'll store a tab order value on the window, but note that this value
		// is only referenced when the window is docked in a Tabbed-frame
		this.tabOrder = ref(0);

		// handle window kind type, defaulting to empty
		kind = (kind === undefined) ? Window.KIND.EMPTY : kind;
		this.kind = kind;

		// save our name for now
		this.title = Window.windowData[this.kind].title;
	}


	/**
	 * Updates the position of the Window
	 * 
	 * @param {Object} pos - object like {x: <number>, y: <number>}, where x and y are optional
	 */
	moveWindow(pos) {

		// only x or y may have been passed in, so use our existing value as defaults
		pos = parseParams(pos, {
			x: this.position.x,
			y: this.position.y
		});

		// update our existing position object
		applyKeys(this.position, pos, ['x', 'y']);
	}


	/**
	 * Updates the size of the Window
	 * 
	 * @param {Object} size - object like {width: <number>, height: <number>}, where width and height are optional.
	 */
	resizeWindow(size) {

		// only x or y may have been passed in, so use our existing value as defaults
		size = parseParams(size, {
			x: this.size.x,
			y: this.size.y
		});

		// update our existing size object
		applyKeys(this.size, size, ['width', 'height']);
	}

}


// Attached KINDS which are also the indices below
Window.KIND = {
	EMPTY: 0,
	EDITOR: 1,
	INSPECTOR: 2,
	VIEWER: 3,
	TOOLS: 4,
	PREFERENCES: 5,
	LOG: 6,
	DEBUG: 7,
};

// we'll attach more data to the Window class, but below here
Window.windowData = [
	{
		title: 'Empty',
		icon: '',
		svgIcon: '',
		kind: Window.KIND.EMPTY,
		hidden: true,
	},
	{
		title: 'Editor',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.EDITOR,
	},
	{
		title: 'Viewer',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.VIEWER,
	},
	{
		title: 'Instrument',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.EMPTY,
	},
	{
		title: 'Tools',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.TOOLS,
	},
	{
		title: 'Preferences',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.PREFERENCES,
	},
	{
		title: 'Log',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.LOG,
	},
	{
		title: 'Debug',
		svgIcon: '#iconFrameSingle',
		icon: '',
		kind: Window.KIND.DEBUG,
	}
];
