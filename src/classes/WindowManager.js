/*
	WindowManager.js
	----------------

	Windows can be split/joined/drag/dropped or made to be floating like an
	old school MDI system.

	For our abstractions we'll define a couple things:

	Window Frames:
	--------------

	A WindowFrame is a container that can contain one or more windows.
	Window frames can exist in one of three Modes:
		- Single
		- Tabbed
		- Tabbed-Iconified (Idea Shelved for now)
		- MWI

	Blender Like: (Single)
		Called SINGLE in the code base (like WindowFrame.STYLE.SINGLE),
		these window frames can only contain one active window at a time.
		It can be switched out with a window-picker in the top-left,
		similar to how Blender swaps out windows.

	Tabbed:
		This is like most other software written in the past 30 years
		(Think Unity, Unreal, QT, GDI, etc.).
		Each window frame has a list of tabs along the top, each tab representing
		an open window.

	Tabbed-Iconified:
		This happens when a tabbed window is shrank to where it's so narrow
		the windows it contains cannot be useful.
		The tabs will instead turn into a list of icons for each tab, and
		when clicked, the window contained withing will temporarily popup.
		NOTE: Tabbed-Iconified should be able to be turned off in settings.

		NOTE 2: Tabbed-Iconified shelved for now

	MWI:
		MWI is like the old school MDI, but MDI stands for Multiple-Document-Interface,
		where as we're concerned with Windows rather than "Documents."

	
	Like Blender, window frames (regardless of window content) can be split or joined,
	and can also be split by dragging and dropping a tab into a quadrant of the window.


	Windows:
	--------

	Windows will be the actual components that are moved around / dragged-&-dropped,
	between the various frames.

	We will use the <Teleport> feature of Vue to move windows to their containers.

	When in Blender or Tabbed mode, windows will inherit the size (width/height)
	of the frame they're inside.

	When dropped into a MWI frame, or popped out from a Tabbed-Icon,
	they will be resizable and manage their own size. MWI windows will
	also manage their X/Y location

	When in Tabbed or MWI mode, windows can be "closed".

	When in Blender-Like mode, Windows cannot be closed, but instead, replaced
	with a different view in the frame.

	For now, all Window components (in Window.vue) will include all
	our various different system's components, but only enable/mount one at a time.

	WindowManager:
	--------------

	The class this file provides will manage _both_:
		- Window Frames
		- Windows

	And our various components that use the reference it
	will be able to access our window framing/window system.

	Note that, another related class and file is the LayoutHelper,
	which can serialize and deserialize custom window Layouts for saving & loading.
*/

// vue
import { ref, shallowRef } from 'vue';

// classes
import WindowLayoutHelper from '@classes/WindowLayoutHelper';
import WindowFrame from '@classes/WindowFrame';
import Window from '@classes/Window';
import EdgeMap from '@classes/EdgeMap';
import WindowDragSystem from '@classes/WindowDragSystem';
import AvailableWindowList from './AvailableWindowList';

// lib/misc
import { rangeOverlap } from '@misc/Utils';
import DragHelper from 'gdraghelper';

// the main money, the WindowManager export
export default class WindowManager {

	// we will store a "snap-size" that we will snap window frame edges
	// for now, we'll make it 5px, but perhaps in the future, this
	// should be user configurable.
	static SNAP_SIZE = 10;

	// we wont allow windows to become smaller than this
	static SMALLEST_WIDTH_OR_HEIGHT = 20;

	// how far mouse should move before we initial a split/merge operation in pixels
	static SPLIT_MERGE_DRAG_THRESHOLD = 10;

	/**
	 * Constructs new WindowManager object
	 * 
	 * @param {Array} availableWindows - an array of Window components that can be used in this WindowManager
	 * @param {Object} defaultLayout - a Window layout object that will be used to initialize the WindowManager
	 * @param {Object} screenPos - the screen position of the WindowManager, reactive measured by the WindowingSystem component
	 * @param {Boolean} useDebugging - OPTIONAL; if true, will enable debugging features
	 */
	constructor(availableWindows, defaultLayout, screenPos, useDebugging) {

		// our list of WindowFrames we manage
		this.frames = [];

		// save our list of available windows, which will be used to spawn new windows
		this.availableWindows = availableWindows || [];
		this.availableWindowList = new AvailableWindowList(this.availableWindows);

		// save our default layout, which will be used to initialize the WindowManager
		this.defaultLayout = defaultLayout || null;

		// save our reactive screen position object
		this.pos = screenPos;

		// save our debug mode param as a ref so maybe we can change it dynamically later
		this.useWindowingDebug = ref(useDebugging || false);

		// make a single instance reusable drag helper, anyone can reference
		this.dragHelper = new DragHelper();

		// the reactive version of the array, that doesn't recursively make all objects inside reactive
		this.framesRef = shallowRef([]);

		// note that despite the fact that Windows "live" inside frames,
		// because windows can be moved around and created/destroyed independently
		// of frames, we'll store our currently spawned list of windows separately:
		this.windows = [];

		// reactive mirror of our windows array
		this.windowsRef = shallowRef([]);

		// reference to the DOM element our Windows spawn in, provided by the WindowingSystem component
		this.windowDOMContainer = null;

		// we'll make this a setting that can be turned on/off
		this.showBlenderSplitMergeHandles = ref(true);

		// this boolean will become true once the corresponding WindowingSystem.vue component
		// has mounted and passed in a reference to the WindowContainer DOM.
		this.isReady = ref(false);

		// if we put a frame_ID in here, all the windowFrames that ARE NOT this ID, should gray out
		// this will be useful for window splitting and what not.
		this.frameFocusID = ref(null);

		// similar to focus, but for selecting a window frame for merging
		this.mergePreviewID = ref(null);
		this.mergePreviewDirection = ref(null);

		// when we're in split-mode, this will be an object, containing details about
		// the current split operation, otherwise null
		this.splitModeDetails = shallowRef(null);

		// our EdgeMap object will move some of the window scaling & fitting code outside this class
		// so let's instantiate one for use once we've loaded a layout
		this.edgeMap = new EdgeMap(this);

		// useful for when we need to drag tabs/windows around
		this.windowDragSystem = new WindowDragSystem(this);

		// when a user tries to drag edges to resize windows 
		this.selectedEdges = shallowRef([]);

		// for debug
		if (this.useWindowingDebug.value == true) {
			console.log('Building new WindowManager');
			window.wm = this;
		}
	}


	/**
	 * Clears our existing windows & layout so a new one can be loaded
	 */
	clearWindowLayout(){

		this.frames = [];
		this.framesRef.value = [];
		this.windows = [];
		this.windowsRef.value = [];
		this.frameFocusID.value = null;
		this.mergePreviewID.value = null;
		this.edgeMap = new EdgeMap(this);
		this.selectedEdges.value = [];
	}


	/**
	 * Loads a WindowLayout once the WindowManager is ready
	 */
	loadWindowLayout() {

		console.log('Building a window layout...');
		WindowLayoutHelper.loadDefaultLayout(this);
	}


	/**
	 * When the one-and-only instance of the WindowingSystem component is mounted, it will tell us about it's DOM
	 * 
	 * @param {DOMElement} el - the DOM element that our windows spawn in, as provided by the mounted component
	 */
	setContainerEl(el) {

		// save & set ourself ready
		this.windowDOMContainer = el;
		this.isReady.value = true;

		// for debug
		console.log('Window Manager is Ready');

		// load a window layout now that we're ready
		this.loadWindowLayout();

		// recompute our EdgeMap at least once no that we're ready
		this.edgeMap.fitWindows(true);
	}


	/**
	 * This should never really be called, because our WindowingSystem component will be mounted for
	 * the lifetime of the application. But for good housekeeping, we'll implement it anyway.
	 */
	unsetContainerEl() {
		this.windowDOMContainer = null;
		this.isReady.value = false;
	}


	/**
	 * Adds a new WindowFrame to our WindowManager
	 * 
	 * @param {number} top - top position of frame, in top-left coordinate space
	 * @param {number} bottom - bottom position of frame, in top-left coordinate space
	 * @param {number} left - left position of frame, in top-left coordinate space
	 * @param {number} right - right position of frame, in top-left coordinate space
	 * @param {Boolean} fitWindows - OPTIONAL; default false - attempt to refit windows when window is added
	 * @param {Object} options - OPTIONAL; WindowFrame options, see WindowFrame.js constructor
	 */
	addWindowFrame(top, bottom, left, right, fitWindows, options) {

		// handle optional parameter
		fitWindows = (fitWindows === undefined) ? false : fitWindows;

		// make a new WindowFrame object & set it's position...
		const newFrame = new WindowFrame(this, options);
		newFrame.updateFramePos({
			t: top,
			b: bottom,
			l: left,
			r: right
		});

		// add to our frames array & reassign reactive array
		this.frames = [...this.frames, newFrame];
		this.framesRef.value = this.frames;

		// refit when new windows are added
		if (fitWindows)
			this.edgeMap.fitWindows(true);

		// return the new frame
		return newFrame;
	}


	/**
	 * Finds a WindowFrame reference by ID, if we have one in this WindowManager
	 * 
	 * @param {Number|String} frameID - either a number, or complete frameID string, like "frame_20"
	 * @returns {WindowFrame|null} - either reference to the found frame, or null if not found
	 */
	getFrameByID(frameID) {

		// if frameID is a number, convert it to the string format
		frameID = (typeof frameID === 'number') ? `frame_${frameID}` : frameID;

		// filter out the frame w/ this ID
		const results = this.frames.filter(f => f.frameID === frameID);

		// if nothing found, return null & GTFO
		if (results.length <= 0)
			return null;

		// this should never happen, because two frames should never share the same ID
		if (results.length > 1) {
			throw new Error('Oh dear, something has gone very wrong.');
		}

		// otherwise, return the first and only result:
		return results[0];
	}


	/**
	 * Helper to find a WindowFrame that contains a given window
	 * 
	 * @param {Window} window - the Window object to find the frame for
	 * @returns {WindowFrame|null} - either a reference to the WindowFrame that contains this window, or null if not found
	 */
	getFrameFromWindow(window){

		// if we have a window, find the frame it belongs to
		if (window == null)
			return null;

		// loop through our frames and find the one that contains this window
		for (let i = 0; i < this.frames.length; i++) {
			const frame = this.frames[i];
			if (frame.windows.includes(window)) {
				return frame;
			}
		}

		// if we didn't find a frame, return null
		return null;
	}


	/**
	 * Removes a WindowFrame from our system
	 * 
	 * @param {Number|String|WindowFrame} frameHandle - either a frameID number, string, or reference to the frame itself
	 * @param {Boolean} fitWindows - OPTIONAL; default false - attempt to refit windows when window is removed
	 */
	removeWindowFrame(frameHandle, fitWindows) {

		// handle optional parameter
		fitWindows = (fitWindows === undefined) ? false : fitWindows;

		// if we got a number convert it to string first
		frameHandle = (typeof frameHandle === 'number') ? `frame_${frameHandle}` : frameHandle;

		// if we have a string, convert it to a look up the WindowFrame reference:
		frameHandle = (typeof frameHandle === 'string') ? this.getFrameByID(frameHandle) : frameHandle;

		// if it's null, we're trying to remove a window that doesn't exist, error & GTFO
		if (frameHandle == null) {
			throw new Error('Attempt to remove a WindowFrame that could not be found or doesn\'t exist');
		}

		// filter it out of our array of frames & update the reactive reference
		this.frames = this.frames.filter(f => f != frameHandle);
		this.framesRef.value = this.frames;

		// optionally refit when windows are removed
		if (fitWindows)
			this.edgeMap.fitWindows(true);
	}


	/**
	 * Starts a WindowFrame split operation on a given Frame.
	 * 
	 * Note that this is a modal-operation, and puts the WindowManager into SplitMode,
	 * which will need to explicitly be completed or cancelled to Exit.
	 * 
	 * @param {WindowFrame} frame - the frame to chop up
	 * @param {Number} axis - Either WindowFrame.SPLIT_MODES.HORIZONTAL or .VERTICAL
	 * @param {Boolean} superSplitMode - OPTIONAL; default = false, if true, we enter super split mode
	 */
	startFrameSplit(frame, axis, superSplitMode) {

		// update our split mode details (which puts us in split mode)
		this.splitModeDetails.value = {
			frame,
			axis,
			superSplitMode: (superSplitMode === undefined) ? false : superSplitMode
		};

		// tell the frame it's in split mode..
		frame.splitMode.value = axis;

		// set our focus system just to focus on this split
		this.frameFocusID.value = frame.frameID;
	}


	/**
	 * End's the split mode on the WindowManager
	 * 
	 * @param {Boolean} complete - true if a split was chosen, false if cancelled
	 * @param {Object} params - OPTIONAL; details of split chosen if not cancelled
	 */
	endFrameSplit(complete, params) {

		// GTFO if we're already out of frame split mode
		if (this.splitModeDetails.value == null)
			return;

		// tell the frame it's no longer in split mode
		this.splitModeDetails.value.frame.splitMode.value = WindowFrame.SPLIT_MODE.OFF;

		// if we successfully split the frame, chop it up:
		if (complete == true) {

			const { frame, axis } = this.splitModeDetails.value;
			const { splitPos } = params;
			const pos = frame.screenPos.value;

			// save initial frame positioning
			const originalFramePos = {
				t: pos.t,
				b: pos.b,
				l: pos.l,
				r: pos.r,
			};

			if (axis == WindowFrame.SPLIT_MODE.HORIZONTAL) {

				// get absolute pos
				const absPos = pos.t + splitPos;

				// shrink original frame to new size & make new frame in void:
				frame.updateFramePos({ b: absPos });
				this.addWindowFrame(absPos, originalFramePos.b, originalFramePos.l, originalFramePos.r);

			} else {

				// get absolute pos
				const absPos = pos.l + splitPos;

				// shrink original frame to new size & make new frame in void:
				frame.updateFramePos({ r: absPos });
				this.addWindowFrame(originalFramePos.t, originalFramePos.b, absPos, originalFramePos.r);
			}

			// refit when split
			if (this.isReady.value == true)
				this.edgeMap.fitWindows(true);
		}

		// clear our split/focus modes
		this.splitModeDetails.value = null;
		this.frameFocusID.value = null;
	}


	/**
	 * Splits a frame in half, based on the passed-in side string'
	 * 
	 * Note this is primarily used for when a drop-target is on one of the sides
	 * @param {WindowFrame} frame - the frame to split
	 * @param {String} side - either "left", "right", "top", or "bottom" from the drag-target
	 * @returns {WindowFrame} - new WindowFrame on the split side
	 */
	splitOnDrop(frame, side) {

		// save initial frame positioning
		const pos = frame.screenPos.value;
		const iPos = {
			t: pos.t,
			b: pos.b,
			l: pos.l,
			r: pos.r,
		};

		const halfX = pos.l + (pos.r - pos.l) / 2;
		const halfY = pos.t + (pos.b - pos.t) / 2;

		// move old frame & make new frame
		let newFrame = null;
		switch (side) {
			case 'left':
				frame.updateFramePos({ l: halfX });
				newFrame = this.addWindowFrame(iPos.t, iPos.b, iPos.l, halfX);
				break;

			case 'right':
				frame.updateFramePos({ r: halfX });
				newFrame = this.addWindowFrame(iPos.t, iPos.b, halfX, iPos.r);
				break;

			case 'top':
				frame.updateFramePos({ t: halfY });
				newFrame = this.addWindowFrame(iPos.t, halfY, iPos.l, iPos.r);
				break;

			case 'bottom':
				frame.updateFramePos({ b: halfY });
				newFrame = this.addWindowFrame(halfY, iPos.b, iPos.l, iPos.r);
				break;

		}// swatch

		// refit & return the new frame
		this.edgeMap.fitWindows(true);
		return newFrame;
	}



	/**
	 * This will be called by the mounted component for our WindowingSystem...
	 * 
	 * ... whenever the DOM's resize observer detects a resize, so we can recompute layout.
	 * @param {Number} newWidth - the width as measured by the WindowingSystem component's resize observer
	 * @param {Number} newHeight - the height as measured by the WindowingSystem component's resize observer
	 */
	onContainerResize(newWidth, newHeight) {

		this.edgeMap.fitWindows();
	}


	/**
	 * Starts dragging to resize based on a WindowFrame's edge
	 * 
	 * @param {WindowFrame} frame - the frame who's edge was clicked for a drag/resize operation
	 * @param {String} edge - one of the WindowFrame.EDGE constants
	 */
	startDrag(frame, edge) {

		// select all edges connected to this frame/edge
		this.selectEdges(frame, edge);

		// determine or orientation parameters
		const E = WindowFrame.EDGE;
		const O = WindowFrame.EDGE_ORIENTATION;
		const orientation = (edge == E.LEFT || edge == E.RIGHT) ? O.VERTICAL : O.HORIZONTAL;

		// use the container size from the DOM element if not provided.
		let width = this.windowDOMContainer.offsetWidth;
		let height = this.windowDOMContainer.offsetHeight;

		// save our initial drag pos:
		const initialDragPos = frame.preferredPos[edge];

		// use our drag helper library to handle mouse input during the drag
		this.dragHelper.dragStart(

			// during drag operation callback
			(dx, dy) => {

				// cache our window frames desired position before we try to move them
				const frameCache = this.edgeMap.getPreferredPositionsCache();

				// convert delta to percentage of screen & compute a new position for the edge
				dx /= width;
				dy /= height;
				const newPos = (orientation == O.VERTICAL) ? (initialDragPos - dx) : (initialDragPos - dy);

				// apply new position to all our selected edges
				for (let i = 0; i < this.selectedEdges.value.length; i++) {
					const { frame, edge } = this.selectedEdges.value[i];
					frame.preferredPos[edge] = newPos;
				}

				// recompute window frames pixel positions on screen
				const { width: w, height: h } = this.edgeMap.fitWindows(false);

				// check if our layout is valid
				const layoutIsValid = this.edgeMap.checkValidLayout(w, h);

				// if it's invalid, reapply the cached values
				if (layoutIsValid == false)
					this.edgeMap.applyPreferredPositionsCache(frameCache);
			},

			// when drag operation is complete callback
			(dx, dy) => {
				this.endDrag();
			});
	}


	/**
	 * Attempt to find all edges connected to the selected edge on a WindowFrame
	 * 
	 * @param {WindowFrame} frame - frame that edge belongs to
	 * @param {String} edge - one of the WindowFrame.EDGE constants
	 */
	selectEdges(frame, edge) {

		// find all edges connected to this edge
		const connectedEdges = this.findConnectedEdges(frame, edge);

		// select everything
		const edgesToSelect = [...connectedEdges];

		// set our reactive array
		this.selectedEdges.value = edgesToSelect;
	}


	/**
	 * Finds all edges horizontally or vertically connected to a window frames edge
	 * 
	 * Returns array of connected edges
	 * @param {WindowFrame} frame - A WindowFrame with an edge to find connected edges on
	 * @param {String} edge - one of the WindowFrame.EDGE constants
	 * @returns {Array<Object>} - array of objects like [{ frame: <WindowFrame>, edge: <String> }]
	 */
	findConnectedEdges(frame, edge) {

		// array of connected edges we found
		const connectedEdges = [];

		// data format will be like:
		// { frame: <WindowFrame>, edge: <String> }

		// add our initial edge
		connectedEdges.push({ frame, edge });

		// make sure our edge-map is refresh rebuilt:
		this.edgeMap.rebuildMap();

		// get the position of our input frames edge:
		const framePos = frame.screenPos.value[edge];

		// determine or orientation parameters
		const E = WindowFrame.EDGE;
		const O = WindowFrame.EDGE_ORIENTATION;
		const orientation = (edge == E.LEFT || edge == E.RIGHT) ? O.VERTICAL : O.HORIZONTAL;
		const sideMinKey = (orientation == O.HORIZONTAL) ? E.LEFT : E.TOP;
		const sideMaxKey = (orientation == O.HORIZONTAL) ? E.RIGHT : E.BOTTOM;
		const edgeMap = (orientation == O.HORIZONTAL) ? this.edgeMap.vMap : this.edgeMap.hMap;

		// get all the edges that share this frame's edge pos, make sure to remove our own frame
		let listOfEdges = edgeMap.get(framePos).filter(i => i.frame != frame);

		// start by selecting the min & max of our current edge
		let rangeA = frame.screenPos.value[sideMinKey];
		let rangeB = frame.screenPos.value[sideMaxKey];

		// loop until we've found an exit condition
		while (true) {

			// true if we found a match in our previous for-loop
			let foundOverlap = false;

			// loop over all the frames that could potentially be a connection,
			// and see if at least one overlaps with our current min/max
			for (let i = 0; i < listOfEdges.length; i++) {

				// get the edge, and it's min/max positions
				const edge = listOfEdges[i];
				const edgeMin = edge.frame.screenPos.value[sideMinKey];
				const edgeMax = edge.frame.screenPos.value[sideMaxKey];

				// see if it overlaps our existing minmax:
				const overlaps = rangeOverlap(rangeA, rangeB, edgeMin, edgeMax);

				// for debug
				// console.log(`${rangeA}-${rangeB} vs ${edgeMin}-${edgeMax} is ${overlaps}`);
				if (overlaps == rangeOverlap.RESULT.OVERLAP || overlaps == rangeOverlap.RESULT.EXACT_MATCH) {

					// add this edge to our list of connected edges:
					connectedEdges.push(edge);

					// remove it from the list of possibilities for the next iteration:
					listOfEdges = listOfEdges.filter(i => i != edge);

					// expand our search range:
					rangeA = (edgeMin < rangeA) ? edgeMin : rangeA;
					rangeB = (edgeMax > rangeB) ? edgeMax : rangeB;

					// we found an overlap, so gtfo of this for loop for meow
					foundOverlap = true;
					break;
				}

			}// next i

			// if we didn't find an overlap on our last pass, we found all connected edges
			if (foundOverlap == false) {
				break;
			}

		}// wend

		// return our list of connected edges
		return connectedEdges;
	}


	/**
	 * Clean up when a resize drag operation is complete
	 */
	endDrag() {

		// select nothing	
		this.selectedEdges.value = [];
	}


	/**
	 * Merges two window frames
	 * 
	 * @param {WindowFrame} frame - the frame we're keeping (merging into other space)
	 * @param {String} edge - one of our WindowFrame.EDGE constants
	 */
	mergeWindowFrames(frame, edge) {

		// we should have a neighbor on this edge...
		const neighbor = frame.neighbors[edge];
		if (neighbor == null) {
			console.error('Merging with neighbor that DNE.');
			return;
		}

		// make new preferred position size combined from both
		const newPreferredPos = {
			t: Math.min(frame.preferredPos.t, neighbor.preferredPos.t),
			b: Math.max(frame.preferredPos.b, neighbor.preferredPos.b),
			l: Math.min(frame.preferredPos.l, neighbor.preferredPos.l),
			r: Math.max(frame.preferredPos.r, neighbor.preferredPos.r),
		};

		// the new preferred pos should encompass the position of both frames
		// so we can override the merging frames positions
		frame.preferredPos = newPreferredPos;

		// kill the old neighborino
		this.removeWindowFrame(neighbor);

		// re layout everything
		this.edgeMap.fitWindows();
	}


	/**
	 * Creates a window & adds it to our list & returns the reference.
	 * 
	 * @param {Number} kind - one of the names in our available window list
	 * @returns {Window} the newly instantiated Window
	 */
	createWindow(kind) {

		// make the new window
		const newWin = new Window(this, kind);

		// add it to our arrays
		this.windows.push(newWin);
		this.windowsRef.value = [...this.windows];

		// return it also
		return newWin;
	}


	/**
	 * Window a WindowFrame deletes windows, they'll still exist in the WindowManager
	 * 
	 * Cull them sombitches
	 */
	cullOrphanedWindows() {

		// loop through our frames and make an array of all windows still docked
		let legitWindows = [];
		this.frames.map(frame => legitWindows = [...legitWindows, ...frame.windows]);

		// keep only legit windows
		this.windows = legitWindows;
		this.windowsRef.value = [...this.windows];
	}


}
