/*
	WindowFrame.js
	--------------

	See the giant comment block at the top of WindowManager.js for a
	break down on what exactly WindowFrames are.

	This file provides the WindowFrame class, as described previously.
*/

// vue
import { reactive, ref, shallowRef } from 'vue';

// classes
import WindowManager from './WindowManager';
import Window from './Window';
import WindowFrameContext from './WindowFrameContext';

// lib/misc
import { clamp01, parseParams, rangeOverlap } from '@misc/Utils';

// the main money: the WindowFrame class export
export default class WindowFrame {

	// we'll use a class static constant, to make sure every spawned
	// window frame has a unique ID.
	static IDCounter = 0;

	// some constants for WindowFrame behaviors...
	static STYLE = {
		SINGLE: 0,
		TABBED: 10,
		MWI: 20
	};

	static SPLIT_MODE = {
		OFF: 0,
		HORIZONTAL: 10,
		VERTICAL: 20
	};

	static EDGE = {
		LEFT: 'l',
		RIGHT: 'r',
		TOP: 't',
		BOTTOM: 'b',
	};

	static EDGE_NEIGHBOR_STATUS = {
		UNDETERMINED: 0,
		EXTREMITY: 1,
		PARTIAL: 2,
		ADJACENT: 3,
		SELECTED: 4, // only true when edge is being dragged. cannot be set selected
	};

	static EDGE_ORIENTATION = {
		VERTICAL: 0,
		HORIZONTAL: 1,
	};


	/**
	 * Constructs a new WindowFrame
	 * 
	 * See comment inside method for optional/default options
	 * 
	 * @param {WindowManager} mgr - the window manager that spawned us
	 * @param {Object} options - OPTIONAL; object containing optional settings for this WindowFrame
	 */
	constructor(mgr, options) {

		// give ourself a unique ID for this instance
		this.frameID = `frame_${WindowFrame.IDCounter++}`;

		// save ref
		this.mgr = mgr;

		// handle default options:
		// by default we'll be a Tabbed Window, that can't be iconified
		options = parseParams(options, {
			frameStyle: WindowFrame.STYLE.TABBED,
			allowIconifying: false,
			addDebugWindows: false
		});

		// save our options on our instance, but _reactively_ 8)
		this.frameStyle = ref(options.frameStyle);
		this.allowIconifying = ref(options.allowIconifying);

		// will be true when the WindowManger want's to split a window
		this.splitMode = ref(WindowFrame.SPLIT_MODE.OFF);

		// keep a list of windows for this frame
		// note: if we're tabbed, this list will be tabs
		// if we're single view, this list will be length 1
		// if we're MWI this list will be the floating windows
		this.windows = [];
		this.windowsRef = shallowRef([]);

		// if this is a tabbed window, we'll store the current tab on the
		// this will be a string windowID if valid, null the rest of the time
		this.currentTab = ref(null);

		// create a default position which can be updated later via methods
		this.screenPos = shallowRef({
			t: 50,
			b: 100,
			l: 70,
			r: 140
		});

		// store the status of each edge in relation to it's neighbors or the screen
		// default to undefined initially
		this.neighborStatus = reactive({
			t: WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			b: WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			l: WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED,
			r: WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED,
		});


		// these will be null, unless a perfect adjacent neighbor is found on that edge
		// these will be updated the same time the above neighborStatus object is updated
		this.neighbors = {
			t: null,
			b: null,
			l: null,
			r: null,
		};


		// in this variable we'll stored "preferred" positions as percentages of the display
		// why? Well when a WindowFrame is initially created it will take up some % of the screen.
		// when we later resize the screen it will try to keep that percentage.
		// if we don't, the WindowFrames will drift over time as the user drags the main Window size.
		// also note: we'll keep this null UNTIL:
		// the first window fitment called in our edge map.
		// we'll also update the percentages if one of this windows edges is resized manually by the user,
		// because that implies the user wants it to fit that percentage
		this.preferredPos = {
			t: 0,
			b: 0,
			l: 0,
			r: 0,
		};

		// reactive version of the above, needed for debut now...
		this.preferredPosRef = ref({});
		this.preferredPosRef.value = { ...this.preferredPos };

		// for debug, we'll give our selves 3 tabs for every new frame
		// if (options.addDebugWindows) {
		// 	this.addWindow(this.mgr.createWindow(EDITOR));
		// 	this.addWindow(this.mgr.createWindow(PREFERENCES));
		// 	this.addWindow(this.mgr.createWindow(DEBUG));
		// }

		// the x/y position to use when in WMI mode to translate the windows
		this.mwiDragX = ref(0);
		this.mwiDragY = ref(0);

		// for public api
		this.frameContext = new WindowFrameContext(this);
	}


	/**
	 * Helper method to return the window frames positions and size in an object
	 * 
	 * @returns {Object} like { top, bottom, left, right, width, height }
	 */
	getFrameDim(includeHeaderOffset) {

		const dim = {
			top: this.screenPos.value[WindowFrame.EDGE.TOP],
			bottom: this.screenPos.value[WindowFrame.EDGE.BOTTOM],
			left: this.screenPos.value[WindowFrame.EDGE.LEFT],
			right: this.screenPos.value[WindowFrame.EDGE.RIGHT]
		};
		dim.width = dim.right - dim.left;
		dim.height = dim.bottom - dim.top;

		// handle optional parameter
		// const yOffset = (includeHeaderOffset === undefined) ? 0 : 40;
		// note: header logic disabled for now, just add generic padding
		dim.top += 2;

		return dim;
	}


	/**
	 * Updates the WindowFrames position
	 * 
	 * @param {Object} values - object with optional keys, like {t: <number>, b..., l..., r...}
	 */
	updateFramePos(values) {

		// replace any skipped params with the current values
		const newPosData = parseParams(values, {
			t: this.screenPos.value.t,
			b: this.screenPos.value.b,
			l: this.screenPos.value.l,
			r: this.screenPos.value.r,
		});

		// update our shallow ref w/ the new positions
		this.screenPos.value = newPosData;
	}


	/**
	 * Saves the percentages our edges are of the container width/height...
	 * 
	 * ... if we already computed them before, we won't compute again, UNLESS forceUpdate is set true
	 * @param {Number} containerWidth - width to compute percentage of
	 * @param {Number} containerHeight - height to compute percentage of
	 * @param {Boolean} forceUpdate - OPTIONAL; by default this will only cache if preferred positions are still null
	 */
	cachePreferredPercentages(containerWidth, containerHeight, forceUpdate) {

		// handle optional parameter
		forceUpdate = (forceUpdate === undefined) ? false : forceUpdate;

		// update w/ normalized %
		const t = clamp01(this.screenPos.value.t / containerHeight);
		const b = clamp01(this.screenPos.value.b / containerHeight);
		const l = clamp01(this.screenPos.value.l / containerWidth);
		const r = clamp01(this.screenPos.value.r / containerWidth);

		// replace nulls, or everything if forceUpdate is true
		this.preferredPos.t = (this.preferredPos.t == null || forceUpdate) ? t : this.preferredPos.t;
		this.preferredPos.b = (this.preferredPos.b == null || forceUpdate) ? b : this.preferredPos.b;
		this.preferredPos.l = (this.preferredPos.l == null || forceUpdate) ? l : this.preferredPos.l;
		this.preferredPos.r = (this.preferredPos.r == null || forceUpdate) ? r : this.preferredPos.r;

		// update reactive ref
		this.preferredPosRef.value = { ...this.preferredPos };
	}


	/**
	 * Updates the position of the window based on it's preferred position percentages
	 * 
	 * @param {Number} containerWidth - the window of the Window space alloted for frames
	 * @param {Number} containerHeight - the height of the window space allowed for frames
	 */
	autoUpdateFramePos(containerWidth, containerHeight) {

		// simple: our percentage positions times the container size
		const newPos = {
			t: (this.preferredPos.t * containerHeight),
			b: (this.preferredPos.b * containerHeight),
			l: (this.preferredPos.l * containerWidth),
			r: (this.preferredPos.r * containerWidth),
		};

		// if a preferred pos is "1" it's on the edge of the window and shouldn't be snapped
		if (this.preferredPos.t < 1)
			newPos.t -= (newPos.t % WindowManager.SNAP_SIZE);
		if (this.preferredPos.b < 1)
			newPos.b -= (newPos.b % WindowManager.SNAP_SIZE);
		if (this.preferredPos.l < 1)
			newPos.l -= (newPos.l % WindowManager.SNAP_SIZE);
		if (this.preferredPos.r < 1)
			newPos.r -= (newPos.r % WindowManager.SNAP_SIZE);

		// use our method that allows us to explicitly set t, b, l, and r
		this.updateFramePos(newPos);
	}


	/**
	 * Check through the edge map and see how our edges relate to the other WindowFrames
	 * @param {Number} width - the width of the viewport at time of window frame fitting
	 * @param {Number} height - the height of the viewport at time of window frame fitting
	 */
	updateNeighbors(width, height) {

		// process each of our edges
		this.updateNeighborsOnEdge(WindowFrame.EDGE.LEFT, width, height);
		this.updateNeighborsOnEdge(WindowFrame.EDGE.RIGHT, width, height);
		this.updateNeighborsOnEdge(WindowFrame.EDGE.TOP, width, height);
		this.updateNeighborsOnEdge(WindowFrame.EDGE.BOTTOM, width, height);
	}


	/**
	 * Computes the current edges relationship to it's neighbors
	 * 
	 * @param {Number} edge - one of the WindowFrame.EDGE values
	 * @param {Number} width - the width of the viewport at the time of window frame fitting
	 * @param {Number} height - the height of the viewport at the time of window frame fitting
	 * @returns {null}
	 */
	updateNeighborsOnEdge(edge, width, height) {

		// clear any neighbor reference for this edge, unless we find an adjacent later on below
		this.neighbors[edge] = null;

		// determine if we're dealing with horizontal or vertical edges
		const edgeIsHorizontal = (edge == WindowFrame.EDGE.TOP || edge == WindowFrame.EDGE.BOTTOM);
		const edgeIsVertical = !edgeIsHorizontal;

		// get the position of our edge in question:
		const edgePos = this.screenPos.value[edge];

		// check if it's an an extremity
		if (edgePos <= 0 || (edgeIsHorizontal && edgePos >= height) || (edgeIsVertical && edgePos >= width)) {
			this.neighborStatus[edge] = WindowFrame.EDGE_NEIGHBOR_STATUS.EXTREMITY;
			return;
		}

		// now, if we weren't an extremity, we'll ASSUME we're a partially adjacent edge
		this.neighborStatus[edge] = WindowFrame.EDGE_NEIGHBOR_STATUS.PARTIAL;

		// now we'll get all the neighbors and look for exact matches

		// pick map to use form our position...
		const posMap = edgeIsHorizontal ? this.mgr.edgeMap.vMap : this.mgr.edgeMap.hMap;

		// get all the frames that share this edge's position, that aren't US
		const potentialExactNeighbors = posMap.get(edgePos).filter(i => i.frame.frameID != this.frameID);

		// for debug
		// console.log(`${this.frameID}'s edges for ${edge}`, potentialExactNeighbors);

		// keys to test
		const testEdgeA = edgeIsVertical ? WindowFrame.EDGE.TOP : WindowFrame.EDGE.LEFT;
		const testEdgeB = edgeIsVertical ? WindowFrame.EDGE.BOTTOM : WindowFrame.EDGE.RIGHT;

		// we'll be A/B:
		const A = this.screenPos.value[testEdgeA];
		const B = this.screenPos.value[testEdgeB];

		// loop over our potential neighbors, looking for exact or partial overlaps
		for (let i = 0; i < potentialExactNeighbors.length; i++) {

			const potentialNeighborFrame = potentialExactNeighbors[i].frame;

			// get C & D from potential frame
			const C = potentialNeighborFrame.screenPos.value[testEdgeA];
			const D = potentialNeighborFrame.screenPos.value[testEdgeB];

			// see if/how they overlap:
			const overlapStatus = rangeOverlap(A, B, C, D);
			if (overlapStatus == rangeOverlap.RESULT.EXACT_MATCH) {

				// we only need one perfect neighbor (there can only be one)
				this.neighborStatus[edge] = WindowFrame.EDGE_NEIGHBOR_STATUS.ADJACENT;

				// save it's ref & gtfo
				this.neighbors[edge] = potentialNeighborFrame;
				return;
			}

		}// next i	

	}


	/**
	 * Adds a window to this frame, or replaces the window if single view
	 * 
	 * @param {Window} newWin - window to add to this frame
	 */
	addWindow(newWin) {

		// clear array before adding window if we only support one at a time
		if (this.frameStyle.value == WindowFrame.STYLE.SINGLE)
			this.windows = [];

		// add window to our static & dynamic arrays
		this.windows.push(newWin);
		this.windowsRef.value = [...this.windows];
	}


	/**
	 * Removes a window by ref or by id
	 * 
	 * @param {Window|String} window - either a Window reference, or windowID string
	 * @param {Boolean} noCull - OPTIONAL, don't delete windows (useful for dragging), default = false
	 */
	removeWindow(window, noCull) {

		// handle optional parameter
		noCull = (noCull === undefined) ? false : noCull;

		// if it's a string, convert to window reference
		if (typeof window === 'string') {

			// get the window reference
			let windowRef = this.windows.filter(w => w.windowID == window)[0];

			// if undefined, gtfo
			if (window === undefined) {
				console.error(`Tried to remove window ${window} from frame ${this.frameID} that doesn't exist`);
				return;
			}

			// save it as our window var now
			window = windowRef;
		}

		// make sure we have a window
		if (window.typeName !== undefined && window.typeName != 'Window') {
			console.error('Tried to remove something other than a window');
			return;
		}

		// now we should be fairly confident that window refers to a window we control
		// filter it out & update arrays
		this.windows = this.windows.filter(w => w != window);
		this.windowsRef.value = [...this.windows];

		// if we're out of windows and we're not MWI, try to merge
		if (this.frameStyle.value != WindowFrame.STYLE.MWI && this.windows.length <= 0) {

			// the order we should check for auto merge
			let mergeCheckOrder = [
				{
					check: WindowFrame.EDGE.RIGHT,
					opposite: WindowFrame.EDGE.LEFT,
				},
				{
					check: WindowFrame.EDGE.BOTTOM,
					opposite: WindowFrame.EDGE.TOP,
				},
				{
					check: WindowFrame.EDGE.LEFT,
					opposite: WindowFrame.EDGE.RIGHT,
				},
				{
					check: WindowFrame.EDGE.TOP,
					opposite: WindowFrame.EDGE.BOTTOM,
				},
			];

			// check each edge and stop when we find one to potentially merge with
			for (let i = 0; i < mergeCheckOrder.length; i++) {

				const edgeToCheck = mergeCheckOrder[i].check;
				const oppositeEdge = mergeCheckOrder[i].opposite;

				// if we have a perfectly adjacent frame on this side, merge with it
				if (this.neighborStatus[edgeToCheck] == WindowFrame.EDGE_NEIGHBOR_STATUS.ADJACENT) {

					// get our neighbor & merge with it's opposite edge
					const neighborFrame = this.neighbors[edgeToCheck]
					this.mgr.mergeWindowFrames(neighborFrame, oppositeEdge);

					// GTFO of for loop, because we found a match
					break;
				}

			}// next i

		}

		// tell window mgr to remove old refs
		if (noCull == false)
			this.mgr.cullOrphanedWindows();
	}


	/**
	 * get opposite edge value
	 * @param {String} edge - one of our WindowFrame.EDGE constants
	 */
	static getOppositeEdge(edge) {
		return {
			t: WindowFrame.EDGE.BOTTOM,
			b: WindowFrame.EDGE.TOP,
			l: WindowFrame.EDGE.RIGHT,
			r: WindowFrame.EDGE.LEFT
		}[edge];
	}

}
