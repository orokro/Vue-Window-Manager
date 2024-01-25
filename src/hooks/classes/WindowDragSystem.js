/*
	WindowDragSystem.js
	-------------------

	When a tab, window title bar, or WMI window is dragged off the frame it belong to,
	we need to animate the window to a thumbnail that is being dragged by the mouse.

	We will also have to enable some drop-target logic, for dropping the window.

	This file, WindowDragSystem.js, will provide the functionality for the  Chrome-like
	window drag system.

	This file will be used in conjunction with WindowDragLayer.vue, which will be the Vue
	component that the window teleports to whist it's being dragged.

	But the state in this file will also affect WindowFrameV.vue components,
	because they will need to enable their drop-targets.

	This will also provide state logic for WindowFrameHeader.vue components.
*/

// vue
import { ref } from 'vue';

// classes
import WindowManager from './WindowManager';
import WindowFrame from './WindowFrame';

// hooks
import useDragHelper from '../useDragHelper';

// invoke hooks
const { dragHelper } = useDragHelper();

// lib/misc


// the main money
export default class WindowDragSystem {

	// set true when we're in the middle of a drag operation
	isDragging = ref(false);

	// we'll store the current drag operation details in this object
	// or, null when not in use
	dragOperationDetails = null;

	// the dynamically updated drag-pos during drag operation
	dragPos = {
		x: ref(0),
		y: ref(0)
	};

	// the position we should should our drop dashed line
	dropRegion = {
		x: ref(-10),
		y: ref(-10),
		width: ref(0),
		height: ref(0),
		isTab: ref(false),
		tabFrame: ref(null),
		tabLeft: ref(0),
		isMWI: ref(false)
	};

	// the last drop-target we found
	dropTarget = {
		frame: null,
		el: null,
		targetRegion: null,
	};


	// the element that is positioned during dragging
	dragTitleEl = ref(null);


	/**
	 * Builds the WindowDragSystem
	 * 
	 * @param {WindowManager} windowMgr - reference to the window manager that instantiated us
	 */
	constructor(windowMgr) {

		// save ref to the window manager that instantiated us
		this.mgr = windowMgr;
	}


	/**
	 * Tears off a window (i.e. starts dragging the window)
	 * 
	 * @param {Window} window - The window to tear of of the frame
	 * @param {WindowFrame} frame - The WindowFrame the window currently belongs to
	 */
	tearWindow(window, frame, titleBarEl) {

		// let's measure our windows initial pos, as well as the drag-handle (tab / titleBar, etc)
		const initialWindowDIM = window.domContainer.value.getBoundingClientRect();
		const initialHandleDIM = titleBarEl.getBoundingClientRect();

		// get the position the cursor is currently at, in global window space
		const cursorPos = dragHelper.getCursorPos();

		// assemble object with details about our drag operation
		const details = {

			// position mouse is on screen when drag was initiated
			initialCursorPos: cursorPos,

			// the initial size of the window being dragged
			initialWindowDIM,

			// the size of the title bar when a drag operation was started
			initialHandleDIM,

			// reference to the handle that was used to start the drag
			handleDOM: titleBarEl,

			// true if it was a tab being dragged (as opposed to a Single or MWI title bar)
			isTab: titleBarEl.classList.contains('tab'),

			// the window being dragged
			window,

			// the frame it's being torn from
			fromFrame: frame
		};

		// drag logic will live in here
		this.startDrag(details);
	}


	/**
	 * Starts the drag operation & starts listening for mouse events and all that
	 * 
	 * @param {Object} details - object with a bunch of details about the drag operation
	 */
	startDrag(details) {

		// save our drag details, which the WindowDragLayer.vue component wil reference
		// when it detects that this.isDragging.value is changed immediately below this
		this.dragOperationDetails = details;

		// true, we're dragging now
		this.isDragging.value = true;

		// we can detach the window from it's old frame (the "from" frame) now that
		// we've collected drag operation details & started the drag
		details.fromFrame.removeWindow(details.window, true);

		// start dragging
		dragHelper.dragStart(

			// during drag
			(dx, dy) => {

				// we'll ignore the deltas and get just the window pos
				const cursorPosNow = dragHelper.getCursorPos();
				this.dragPos.x.value = cursorPosNow.x;
				this.dragPos.y.value = cursorPosNow.y;

				// see if we're over a drop-target
				this.raycastForDropTarget(cursorPosNow.x, cursorPosNow.y);

			},

			// upon drag complete
			(dx, dy) => {

				// apply whatever the last drop target was
				this.applyDropTarget();

				// we're done now, so we'll reset drag vars
				this.isDragging.value = false;
				this.mgr.frameFocusID.value = null;
				this.dropTarget = {
					frame: null,
					el: null,
					targetRegion: null,
				};

				// reset drag region (the dashed white frame uses these, for instance)
				this.dropRegion.x.value = -10;
				this.dropRegion.y.value = -10;
				this.dropRegion.width.value = 0;
				this.dropRegion.height.value = 0;
				this.dropRegion.isTab.value = false;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = 0;

			}
		);
	}


	/**
	 * When drag operation completes, set window in new frame
	 */
	applyDropTarget() {

		/*

			// the last drop-target we found
			dropTarget = {
				frame: null,
				el: null,
				targetRegion: null,
			};
		*/

		// add it to the last drop-target we hit
		if (this.dropTarget.frame != null) {

			const frame = this.dropTarget.frame;
			const window = this.dragOperationDetails.window;

			// if the target is "frame" or "tab" just add it immediately
			if (this.dropTarget.targetRegion == 'frame' || this.dropTarget.targetRegion == 'tab') {

				// add the tab
				frame.addWindow(window)

				// if the drop frame was MWI, compute new x/y for the window
				if (frame.frameStyle.value == WindowFrame.STYLE.MWI) {

					const fDim = frame.getFrameDim(true);
					window.position.x = this.dropRegion.x.value - fDim.left - frame.mwiDragX.value;
					window.position.y = this.dropRegion.y.value - fDim.top - frame.mwiDragY.value;
				}

				// otherwise, we have to split the region
			} else {

				// ask window manager to split the frame on the drop-region edge
				const newFrame = this.mgr.splitOnDrop(frame, this.dropTarget.targetRegion);

				// & add the new window
				newFrame.addWindow(window);
			}

			// other wise, put it back in the frame it came from
		} else {

			const frame = this.dragOperationDetails.fromFrame;
			const window = this.dragOperationDetails.window;

			frame.addWindow(window)
		}
	}


	/**
	 * Checks what's under the cursor looking for potential drop-targets
	 * 
	 * @param {Number} x - the screen position X value to "raycast" at
	 * @param {Number} y - the screen position Y value to "raycast" at
	 */
	raycastForDropTarget(x, y) {

		// get the element under the x/y value
		const el = document.elementFromPoint(x, y);

		// if we didn't hit anything, gtfo
		if (el == null || el === undefined)
			return;

		// check if it's a drop target:
		const isDropTarget = el.classList.contains('dropTarget');

		// gtfo if it's not
		if (isDropTarget == false)
			return;

		// get the frame this target belongs to
		const frameID = el.getAttribute('frameID');

		// focus this frame so it light sup
		this.mgr.frameFocusID.value = frameID;

		// get the frame reference & the window we're moving
		const frame = this.mgr.getFrameByID(frameID);
		const window = this.dragOperationDetails.window;

		if (frame == null)
			return;

		// check the drop region
		const targetRegion = el.getAttribute('region');

		// save the target data since we found a target
		this.dropTarget = {
			frame,
			el,
			targetRegion
		};

		// for maths
		const tabHeight = 25;

		// some defaults to reset
		this.dropRegion.isTab.value = false;
		this.dropRegion.isMWI.value = false;

		// compute the region parameters based on this frame
		const fDim = frame.getFrameDim(true);
		switch (targetRegion) {

			case 'left':
				this.dropRegion.x.value = fDim.left;
				this.dropRegion.y.value = fDim.top;
				this.dropRegion.width.value = fDim.width * 0.5;
				this.dropRegion.height.value = fDim.height;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = null;
				break;

			case 'right':
				this.dropRegion.x.value = fDim.left + fDim.width * 0.5;
				this.dropRegion.y.value = fDim.top;
				this.dropRegion.width.value = fDim.width * 0.5;
				this.dropRegion.height.value = fDim.height;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = null;
				break;

			case 'top':
				this.dropRegion.x.value = fDim.left;
				this.dropRegion.y.value = fDim.top;
				this.dropRegion.width.value = fDim.width;
				this.dropRegion.height.value = fDim.height * 0.5;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = null;
				break;

			case 'bottom':
				this.dropRegion.x.value = fDim.left;
				this.dropRegion.y.value = fDim.top + fDim.height * 0.5;
				this.dropRegion.width.value = fDim.width;
				this.dropRegion.height.value = fDim.height * 0.5;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = null;
				break;

			case 'frame':
				this.dropRegion.x.value = fDim.left;
				this.dropRegion.y.value = fDim.top;
				this.dropRegion.width.value = fDim.width;
				this.dropRegion.height.value = fDim.height;
				this.dropRegion.tabFrame.value = null;
				this.dropRegion.tabLeft.value = null;

				// for MWI windows in the center, we should preview it's floating window
				if (frame.frameStyle.value == WindowFrame.STYLE.MWI) {

					// get the position of the floating tab dragged by the user
					const r = this.dragTitleEl.value.getBoundingClientRect();
					this.dropRegion.x.value = r.left;
					this.dropRegion.y.value = r.top;
					this.dropRegion.width.value = window.size.width;
					this.dropRegion.height.value = window.size.height;
					this.dropRegion.isMWI.value = true;
				}

				// if it's a tabbed frame, add tab on right
				if (frame.frameStyle.value == WindowFrame.STYLE.TABBED) {
					this.dropRegion.y.value += tabHeight;
					this.dropRegion.height.value -= tabHeight;
					this.dropRegion.isTab.value = true;
					this.dropRegion.tabFrame.value = frameID;

					// if we're not directly over the tab strip,
					// well make this arbitrarily far right
					this.dropRegion.tabLeft.value = 99999;
				}

				break;

			case 'tab':
				this.dropRegion.x.value = fDim.left;
				this.dropRegion.y.value = fDim.top + tabHeight;
				this.dropRegion.width.value = fDim.width;
				this.dropRegion.height.value = fDim.height - tabHeight;
				this.dropRegion.isTab.value = true;
				this.dropRegion.tabFrame.value = frameID;

				// get the elements position & use it to compute left
				const r = el.getBoundingClientRect();
				const cursorX = dragHelper.getCursorPos().x;
				this.dropRegion.tabLeft.value = (cursorX - r.left) - 10;
				break;

		}// swatch

	}

}
