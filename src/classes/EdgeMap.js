/*
	EdgeMap.js
	----------

	This file provides a class called EdgeMap,
	that manages the relationship of WindowFrames and their neighbors that share edges.

	When a WindowFrame is resized a long one of it's four edges, the neighboring window must also be resized.

	However, sometimes multiple WindowFrames can share an edge.

	It's important to note that there are a couple different cases we're interested in, please consult the ASCII diagram below:
	┌──────────┬──────────┬──────────┐
	| Window 1  | Window 2  | Window 3  |
	|           |           ├──────────┤
	|           |           | Window 4  |
	└──────────┴──────────┴──────────┘
	* Window 1 shares a complete edge with Window 2, such that the RIGHT-edge of Window 1 is the same as the LEFT-edge of Window 2
	* Window 2 shares a partial edge with window 3
	* Window 2 shares a partial edge with window 4
	* Window 1 and Window 2 are horizontally adjacent
	* Window 2 and Window 3 are partially horizontally adjacent
	* Window 2 and Window 4 are partially horizontally adjacent
	* Window 3 and Window 4 are vortically adjacent
	* Window 1, Window 2, and Window 3 all share a top-edge, in a non-adjacent manner
	* Window 1, Window 2, and Window 4 all share a bottom-edge, in a non-adjacent manner
	* Window 3 and Window 4 share a complete edge, such tha the BOTTOM-edge of Window 3 is the same as the TOP-edge of Window 4
	* Window 3 and Window 4 share a left-edge, in a non-adjacent manner

	The diagram above is a sample of the complexity that WindowPane edge relationships can have.
	IF YOU SKIMMED THE ABOVE LIST, please go back and examine it closely.

	The take-away is:
	* Shared Edges can be Adjacent (the left/right or top/bottom of WindowPanes occupy the same edge)
	* Shared Edges can be Non-Adjacent. (the top/bottom/left/right edges continue onto adjacent WindowPanes, but not along the adjacent edge)
	* Adjacent edges can be partial
*/

// classes
import WindowManager from './WindowManager';
import WindowFrame from './WindowFrame';

export default class EdgeMap {

	/**
	 * Constructs the EdgeMap for our WindowManager
	 * 
	 * @param {WindowManager} windowMgr - Reference to the WindowManager that instantiated us
	 */
	constructor(windowMgr) {

		// save ref to the WindowManager we're working with / part of
		this.windowMgr = windowMgr;

		// we will manage multiple Maps that map screen pixel positions to groups of edges...
		// specifically:
		// x pos, y pos, horizontal edges, vertical edges, top pos, bottom pos, left pos, right pos of WindowFrames
		this.xMap = new Map();
		this.yMap = new Map();
		this.hMap = new Map();
		this.vMap = new Map();
		this.lMap = new Map();
		this.rMap = new Map();
		this.tMap = new Map();
		this.bMap = new Map();

		// at any given time, we'll keep track of the minimum and maximum x/y found in the windowing system
		this.xMin = null;
		this.xMax = null;
		this.yMin = null;
		this.yMax = null;
	}


	/**
	 * Loops over all the WindowFrames in our WindowManager and records the various places their edges are
	 */
	rebuildMap() {

		// start with all fresh maps
		this.xMap = new Map();
		this.yMap = new Map();
		this.hMap = new Map();
		this.vMap = new Map();
		this.lMap = new Map();
		this.rMap = new Map();
		this.tMap = new Map();
		this.bMap = new Map();

		// and nullified extremes
		this.xMin = null;
		this.xMax = null;
		this.yMin = null;
		this.yMax = null;

		/**
		 * Helper method in local-scope to add to our maps. This doesn't need to be a class method.
		 * 
		 * @param {Map} map - one of our position maps we're tracking
		 * @param {Number} key - a number representing one of the pixel positions of a WindowFrames edge
		 * @param {Object} value - the data to add to the array for that key
		 */
		const addToMap = (map, key, value) => {

			// if we have this position as a key already, add the value to it's array
			if (map.has(key)) {
				map.get(key).push(value);

				// otherwise, add a new array
			} else {
				map.set(key, [value]);
			}
		};


		// loop over each WindowFrame in the window manager..
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// ref to the frame:
			const frame = this.windowMgr.frames[i];

			// break out the positions, in some kinda pixel-space
			let { t, b, l, r } = frame.screenPos.value;

			// for now, we will always normalize coordinates to their snap size at this step
			t = t - (t % WindowManager.SNAP_SIZE);
			b = b - (b % WindowManager.SNAP_SIZE);
			l = l - (l % WindowManager.SNAP_SIZE);
			r = r - (r % WindowManager.SNAP_SIZE);

			// authors note:
			// technically L should always be smaller than R, and T should always be smaller than B
			// because of our top-left=(0, 0) coordinate space, obviously tops and lefts are less.
			// but just to look-both-ways on a one-way-street, I'll still use Math.min(...) and Math.max(...)

			// update our min & max horizontals:
			const hMin = Math.min(l, r);
			const hMax = Math.max(l, r);
			this.xMin = (this.xMin == null || (hMin < this.xMin)) ? hMin : this.xMin;
			this.xMax = (this.xMax == null || (hMax > this.xMax)) ? hMax : this.xMax;

			// update our min & max verticals:
			const vMin = Math.min(t, b);
			const vMax = Math.max(t, b);
			this.yMin = (this.yMin == null || (vMin < this.yMin)) ? vMin : this.yMin;
			this.yMax = (this.yMax == null || (vMax > this.yMax)) ? vMax : this.yMax;

			// update our maps with all our sides & reference to this window...

			// raw x/y maps
			addToMap(this.xMap, l, { frame, edge: WindowFrame.EDGE.LEFT });
			addToMap(this.xMap, r, { frame, edge: WindowFrame.EDGE.RIGHT });
			addToMap(this.yMap, t, { frame, edge: WindowFrame.EDGE.TOP });
			addToMap(this.yMap, b, { frame, edge: WindowFrame.EDGE.BOTTOM });

			// combination horizontal vertical (how is this different than x/y? idk)
			addToMap(this.hMap, l, { frame, edge: WindowFrame.EDGE.LEFT });
			addToMap(this.hMap, r, { frame, edge: WindowFrame.EDGE.RIGHT });
			addToMap(this.vMap, t, { frame, edge: WindowFrame.EDGE.TOP });
			addToMap(this.vMap, b, { frame, edge: WindowFrame.EDGE.BOTTOM });

			// just specific edge maps
			addToMap(this.lMap, l, { frame, edge: WindowFrame.EDGE.LEFT });
			addToMap(this.rMap, r, { frame, edge: WindowFrame.EDGE.RIGHT });
			addToMap(this.tMap, t, { frame, edge: WindowFrame.EDGE.TOP });
			addToMap(this.bMap, b, { frame, edge: WindowFrame.EDGE.BOTTOM });

		}// next i

	}


	/**
	 * Loops over all the WindowFrames were are recently loaded but not yet "fit" to the screen...
	 * 
	 * ... this method should only be called ONCE immediately after a layout is loaded
	 * Once a layout is loaded, no mater how it is split or joined, it should maintain itself,
	 * in screen/window space.
	 */
	computeFrameLayout() {

		// loop over all our windows and find the min/max of their edge positions
		let minX = null;
		let maxX = null;
		let minY = null;
		let maxY = null;

		// loop over all frames in window manager
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// get the frame and all four of it's edges as initially defined for now
			const frame = this.windowMgr.frames[i];
			const { t, b, l, r } = frame.screenPos.value;

			// check horizontal (x) min and maxes
			minX = (minX == null || l < minX) ? l : minX;
			minX = (minX == null || r < minX) ? r : minX;
			maxX = (maxX == null || l > maxX) ? l : maxX;
			maxX = (maxX == null || r > maxX) ? r : maxX;

			// check vertical (y) min and maxes
			minY = (minY == null || t < minY) ? t : minY;
			minY = (minY == null || b < minY) ? b : minY;
			maxY = (maxY == null || t > maxY) ? t : maxY;
			maxY = (maxY == null || b > maxY) ? b : maxY;

		}// next i

		// we can now compute the initial width and height of the layout as it was arbitrarily loaded
		const initialWidth = (maxX - minX);
		const initialHeight = (maxY - minY);

		// now that we have the min/max computed, we can convert the windows positions
		// from their arbitrary loaded space, to percentages, which we'll use to compute the real layout
		// so, let's loop over the windows again but this time update their position,
		// and cache their percentages
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// get the frame and all four of it's edges as initially defined for now
			const frame = this.windowMgr.frames[i];
			let { t, b, l, r } = frame.screenPos.value;

			// convert the positions to be 0, 0 based instead of whatever the old minimum was:
			t -= minY;
			b -= minY;
			l -= minX;
			r -= minX;

			// now, in theory the window frame values should be the same sizes as before, but moved to the top-left
			// and they should fit withing the initial width and height
			// so let's set those values back
			frame.updateFramePos({ t, b, l, r });

			// now if we call the percentage caching method, we can get accurate percentages for the windows positions
			frame.cachePreferredPercentages(initialWidth, initialHeight, true);

		}// next i

		// now that we have computed the layout at least once, we can call
		// our regular fit windows method to move them into their final place:
		this.fitWindows();
	}


	/**
	 * When window is resized or we split/merge windows, etc, we should re-fit them to the screen
	 * 
	 * @param {Boolean} recomputeLayout - OPTIONAL; default is false
	 * @param {Number} width - OPTIONAL; width of screen to move windows to
	 * @param {Number} height - OPTIONAL; height of screen to move windows to
	 */
	fitWindows(recomputeLayout, width, height) {

		// if handle optional recompute parameter forcing us to recompute windows when layed out
		recomputeLayout = (recomputeLayout === undefined) ? false : recomputeLayout;

		// if we were asked to recompute the layout, do so now
		if (recomputeLayout)
			this.computeFrameLayout();

		// use the container size from the DOM element if not provided.
		width = (width === undefined) ? this.windowMgr.windowDOMContainer.offsetWidth : width;
		height = (height === undefined) ? this.windowMgr.windowDOMContainer.offsetHeight : height;

		// to allow some room on the bottom for grab handles:
		height -= 4;

		// loop over all frames and tell them to update w/ our new container size
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// get the frame and all four of it's edges as initially defined for now
			const frame = this.windowMgr.frames[i];
			frame.autoUpdateFramePos(width, height);
		}// next i

		// whenever windows are moved, rebuild our map:
		this.rebuildMap();

		// and when our map is rebuilt, after moving windows we can check their neighbor status
		this.evaluateNeighbors(width, height);

		// return our dimensions
		return { width, height };
	}


	/**
	   * Checks if all our windows are in a valid state
	 * 
	 * @param {Number} width - width of layout
	 * @param {Number} height - height of layout
	 * @returns {Boolean} - true if all Window Frames are layed out OK
	 */
	checkValidLayout(width, height) {

		// loop over all frames and tell them to update w/ our new container size
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// get the frame and all four of it's edges as initially defined for now
			const frame = this.windowMgr.frames[i];

			// get dimensions of frame:
			const frameDim = frame.getFrameDim();

			// if either width or height are too small, return false
			if (frameDim.width < WindowManager.SMALLEST_WIDTH_OR_HEIGHT)
				return false;
			if (frameDim.height < WindowManager.SMALLEST_WIDTH_OR_HEIGHT)
				return false;

			// the right should never be smaller than the left, same with bottom vs top
			if (frameDim.right < frameDim.left)
				return false;
			if (frameDim.bottom < frameDim.top)
				return false;

			// the left and top edges should never be below 0
			if (frameDim.left < 0 || frameDim.top < 0)
				return false;

			// the right and bottom should never exceed the width and height, respectively
			if (frameDim.right > width || frameDim.bottom > height)
				return false;

		}// next i

		// if we managed to loop over every frame and not find any errors,
		// we can return true - all is good
		return true;
	}


	/**
	 * Tells all the WindowFrames to check who their edges are neighbor with
	 * 
	 * @param {Number} width - the width of the viewport at time of window frame fitting
	 * @param {Number} height - the height of the viewport at time of window frame fitting
	 */
	evaluateNeighbors(width, height) {

		// loop over each WindowFrame in the window manager..
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// ref to the frame:
			const frame = this.windowMgr.frames[i];
			frame.updateNeighbors(width, height);

		}// next i
	}


	/**
	 * When ever we do a big operation, like dragging to resize window frames or whatever,
	 * we might want to "undo" the last operation if it ended in an invalid state.
	 * 
	 * So, this will return an array of frames preferred positions as the currently stand,
	 * which can be applied later to undo the "damage"
	 */
	getPreferredPositionsCache() {

		const cache = [];

		// loop over all frames and tell them to update w/ our new container size
		for (let i = 0; i < this.windowMgr.frames.length; i++) {

			// get the frame and all four of it's edges as initially defined for now
			const frame = this.windowMgr.frames[i];

			// mix in it's t/b/l/r so we get a new object instead of a ref (since the original object will change)
			cache.push({
				id: frame.frameID,
				...frame.preferredPos,
			});

		}// next i

		return cache;
	}


	/**
	 * Applies a cache of preferred window frame positions back to the frames
	 * 
	 * @param {Array<Object>} cache - array of objects like { id, t, b, l r } to apply back to our frames preferred positions
	 * @param {Boolean} autoFitWindowsUponCompletion - OPTIONAL; DEFAULT: true, auto refit windows after applying
	 */
	applyPreferredPositionsCache(cache, autoFitWindowsUponCompletion) {

		// error handle
		cache = (cache === undefined) ? [] : cache;

		for (let i = 0; i < cache.length; i++) {

			// get the cache data that includes the frame's ID, plus it's floating point top (t), bottom (b), left (l), and right (r)
			const posData = cache[i];

			// look up reference to the frame:
			const frame = this.windowMgr.getFrameByID(posData.id);

			// delete the ID key from our data, since it's not meant to be in the preferred positions
			delete posData.id;

			// assign the remaining t/b/l/r to the actual frames data
			frame.preferredPos = { ...posData };

		}// next i

		// handle optional parameter and attempt to refit the windows
		autoFitWindowsUponCompletion = (autoFitWindowsUponCompletion === undefined) ? true : autoFitWindowsUponCompletion;
		if (autoFitWindowsUponCompletion)
			this.fitWindows();

	}

}
