<!--
	WindowFrameContents.vue
	-----------------------

	So our windowing system has WindowFrameV.vue components,
	which mainly handle logic for:
		- the dragging-to-resize
		- the splitting logic
		- the merging logic
		- the hamburger menu

	The header for our frames (including tabs if it's a Tabbed style frame),
	is handled in WindowFrameHeader.vue.

	Thus, this file actually spawns the _containers_ to mount our windows in.

	In other words this will create the DOM elements that our Window contents teleports too.
-->
<template>
	<div 
		:style="{
			'background-position': `${frame.mwiDragX.value}px ${frame.mwiDragY.value}px`,
			'--bg-image--old': `url('/mwi_dot.png')`,
			'--bg-image': `url(${frame.mgr.mwiBGImagePath.value})`,
		}"
		:class="{
			frameContents: true,
			noHeader: frame.frameStyle.value==WindowFrame.STYLE.MWI,
			isDragging: isDraggingBG
		}"
		
		@mousedown="e=>startMWIDrag(e)"
		@contextmenu="onBgContextMenu"
		@mouseleave="mouseLeave"
	>
			
		<!-- debug message, if applicable -->
		<div v-if="false && useWindowingDebug==true" class="debugPanel b l">
			This is window frame "{{ frame.frameID }}"<br>
			PP TBLR:
			{{ frame.preferredPosRef.value.t.toFixed(2) }},
			{{ frame.preferredPosRef.value.b.toFixed(2) }},
			{{ frame.preferredPosRef.value.l.toFixed(2) }},
			{{ frame.preferredPosRef.value.r.toFixed(2) }}, 
		</div>

		<!-- a div used to reposition MWI windows when background is dragged -->
		<div
			class="dragLayer"
			:style="{
				left: (frame.frameStyle.value==WindowFrame.STYLE.MWI) ? `${frame.mwiDragX.value}px` : '0px',
				top: (frame.frameStyle.value==WindowFrame.STYLE.MWI) ? `${frame.mwiDragY.value}px` : '0px',
			}"
		>

			<!-- spawn a container for each window we have on our frame -->
			<div 
				v-for="(win, idx) in frame.windowsRef.value"
				v-show="shouldShowFrame(win)"
				:key="win.windowID"
				:idx="idx"
				:class="getContainerClassName(frame)"
				:style="getContainerStyle(win)"
				class="windowContentsContainer"
				@mousedown="e=>onContainerMouseDown(e, win)"
				@contextmenu="onContainerContextMenu"
			>

				<!-- when in MDI mode, windows have title bars that can drag, close, etc -->
				<div class="titleBar" @mousedown="e=>startWindowDrag(e, win)">

					<!-- the icon, if applicable -->
					<div 
						v-if="win.windowDetails.icon!=''"
						class="icon"
						:style="{
							backgroundImage: `url('${win.windowDetails.icon}')`,
						}"
					/>

					<!-- the titlebar title text -->
					<div class="titleText">{{ win.titleRef.value }}</div>

					<!-- minimize button (only when the MWI task bar is enabled to recover it) -->
					<div
						v-if="frame.mgr.mwiTaskBar.value==true"
						class="minimizeButton"
						@mousedown="minimizeWindow($event, win)"
					>
						<span>&#8722;</span>
					</div>

					<!-- close button -->
					<div class="closeButton" @mousedown="closeWindow(win)">
						<span>✖</span>
					</div>

				</div>
				<div class="windowContents" :ref="el=>setRef(el, win)"></div>

				<!-- the grab-handles to resize MWI windows -->
				
				<!-- edge handles -->
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle left" @mousedown="resizeMWI(win, 'left')"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle right" @mousedown="resizeMWI(win, 'right')"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle top" @mousedown="resizeMWI(win, 'top')"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle bottom" @mousedown="resizeMWI(win, 'bottom')"></div>

				<!-- corner handles -->
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle tl" @mousedown="resizeMWI(win, ['top', 'left'])"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle tr" @mousedown="resizeMWI(win, ['top', 'right'])"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle bl" @mousedown="resizeMWI(win, ['bottom', 'left'])"></div>
				<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="mwiResizeHandle br" @mousedown="resizeMWI(win, ['bottom', 'right'])"></div>
				
			</div>
		</div>

		<!-- a layer that shows a drop shadow, if we're in MWI mode -->
		<div v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI" class="MWIInnerShadow"></div>

		<!-- the MWI task bar, when enabled (sits outside the pan layer so it never moves) -->
		<MWITaskBar
			v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI && frame.mgr.mwiTaskBar.value==true"
			:frame="frame"
		/>

		<!-- a floating "start" button when the start menu is on but the task bar is off -->
		<div
			v-if="frame.frameStyle.value==WindowFrame.STYLE.MWI && frame.mgr.mwiStartMenu.value==true && frame.mgr.mwiTaskBar.value!=true"
			class="floatingStartButton noSel"
			title="Add a window"
			@mousedown.stop="openStartMenu"
		>
			<div class="startIcon"></div>
		</div>

	</div>
</template>
<script setup>

// vue
import { ref, watch, onMounted } from 'vue';

// components
import MWITaskBar from './MWITaskBar.vue';

// lib/misc
import WindowFrame from '@classes/WindowFrame';
import WindowManager from '@classes/WindowManager';
import Window from '@classes/Window';
import { showAddWindowMenu } from '@misc/frameMenus';

// define our props
const props = defineProps({

	// the window frame we represent
	frame: {
		type: WindowFrame,
		default: null
	}
});

// define some events
const emits = defineEmits(['onWindowTearOff']);

// when we spawn new windows in MWI mode, we'll stagger them with these variables
let cascadeSpawnPos = 10;

// true when dragging the bg
const isDraggingBG = ref(false);

// save reference to the title bar when a window is being dragged,
// because we'll want to measure it if we eventually tear the window off
// we'll keep this variable 'null' when not in use
let MWITitleBarBeingDragged = null;

// reference to the window being dragged
let windowBeingDragged = null;

// true when we're repositioning a window
const isDraggingMWIWindow = ref(false);

// ref to drag helper callbacks id for cancellation
let dragHelperCBRefID = null;

// when our window style changes, we need to update our tabs list.
watch(
	()=>props.frame.frameStyle.value,
	()=>{
		if(props.frame.frameStyle.value==WindowFrame.STYLE.MWI){
			cascadeWindows(props.frame.windows);
		}
	}
);


// when our window style changes, we need to update our tabs list.
watch(
	()=>props.frame.windowsRef.value.length,
	()=>{
		if(props.frame.frameStyle.value==WindowFrame.STYLE.MWI){
			cascadeWindows(props.frame.windows);

			// focus newest added window, unless we're out of windows
			if(props.frame.windows.length>0){
				const lastWinIdx = props.frame.windows.length - 1;
				const lastWin = props.frame.windows[lastWinIdx];
				sortWindowOnTop(lastWin);
			}
		}
	}
);


// when a layout declares an MWI frame directly, its windows are added before this
// component mounts, so neither watcher above fires for them - lay them out once on mount
// so they don't all stack at 0,0.
onMounted(()=>{
	if(props.frame.frameStyle.value==WindowFrame.STYLE.MWI)
		cascadeWindows(props.frame.windows);
});


/**
 * Handle when the mouse leaves our entire WindowFrame container, so we can tear windows
 */
function mouseLeave(){

	// if we left the window while we were dragging a window,
	// let's tear it of
	if(isDraggingMWIWindow.value==true){

		// save window & clear variable
		const window = windowBeingDragged;
		windowBeingDragged = null;

		// tear off the window
		startWindowTear(window);
	}
}


/**
 * 
 * @param {Window} window - the window to tear off
 */
function startWindowTear(window){
	
	// clear drag variable, if it was set or w/e
	windowBeingDragged = null;

	// cancel old drag helper now
	const dragHelper = props.frame.mgr.dragHelper;
	if(dragHelperCBRefID!=null){
		dragHelper.cancelCallback(dragHelperCBRefID);
		dragHelperCBRefID = null;
	}

	// save our title bar ref
	const titleBar = MWITitleBarBeingDragged;

	// no longer dragging
	isDraggingMWIWindow.value = false;
	MWITitleBarBeingDragged = null;
	
	// raise the event for tear
	emits('onWindowTearOff', {
		window,
		frame: props.frame,
		titleBar: titleBar
	});
}


/**
 * Starts the resize-drag operation for a window
 * 
 * @param {Window} win - Window to resize
 * @param {String|Array<String>} sides - either an array of strings, or a string, for which sides to resize
 */
function resizeMWI(win, sides){

	// save window initial properties
	const startDragWinDIM = {
		x: win.position.x,
		y: win.position.y,
		width: win.size.width,
		height: win.size.height
	};

	// make sure sides is an array
	sides = (Array.isArray(sides)==false) ? [sides] : sides;

	// use our drag helper to move the windows
	const dragHelper = props.frame.mgr.dragHelper;
	dragHelper.dragStart(

		// during drag operation
		(dx, dy) => {

			sides.map(side =>{
				switch(side){

				// left side, adjust the width AND the left side x position
				case 'left':
					win.size.width = startDragWinDIM.width + dx;
					win.position.x = startDragWinDIM.x - dx;
					break;

					// top side, adjust the height AND the top side y position
				case 'top':
					win.size.height = startDragWinDIM.height + dy;
					win.position.y = startDragWinDIM.y - dy;
					break;

					// right side, just adjust the width
				case 'right':
					win.size.width = startDragWinDIM.width - dx;
					break;

					// bottom side, just adjust the height
				case 'bottom':
					win.size.height = startDragWinDIM.height - dy;
					break;
					
				}// swatch
			});

			// make sure our width & height are valid
			win.size.width = (win.size.width<100) ? 100 : win.size.width;
			win.size.height = (win.size.height<40) ? 40 : win.size.height;
			
		},

		// upon drag complete
		(dx, dy)=>{

			// we're done dragging now
			isDraggingBG.value = false;
	
		}
	);
}


/**
 * Starts dragging the background of the MWI container to move all windows at once
 * 
 * @param {Event} e - JavaScript event object
 */
function startMWIDrag(e){

	// gtfo if not right click
	if(e.which != 3)
		return;

	// stop normal behavior
	e.preventDefault();

	// remember where the press happened (for a potential start-menu popup) & whether we panned
	const menuPos = { x: e.x, y: e.y };
	let didPan = false;

	// save initial x/y position of the window
	const startDragPos = {
		x: props.frame.mwiDragX.value,
		y: props.frame.mwiDragY.value,
	};

	// we're dragging now
	isDraggingBG.value = true;

	// use our drag helper to move the windows
	const dragHelper = props.frame.mgr.dragHelper;
	dragHelper.dragStart(

		// during drag operation
		(dx, dy) => {

			// once the cursor has moved past the threshold, treat this as a real pan
			if(Math.abs(dx) + Math.abs(dy) > WindowManager.SPLIT_MERGE_DRAG_THRESHOLD)
				didPan = true;

			// move windows
			props.frame.mwiDragX.value = startDragPos.x - dx;
			props.frame.mwiDragY.value = startDragPos.y - dy;
		},

		// upon drag complete
		(dx, dy)=>{

			// we're done dragging now
			isDraggingBG.value = false;
			MWITitleBarBeingDragged = null;

			// a right-click WITHOUT a drag opens the start menu (when enabled) instead of panning
			if(didPan==false && props.frame.mgr.mwiStartMenu.value==true)
				showAddWindowMenu(props.frame.mgr, props.frame, menuPos.x, menuPos.y);

		}
	);

}


/**
 * Starts dragging a window when we're in MWI mode
 * 
 * @param {Event} e - JavaScript Event Object
 * @param {Window} win - the window to drag
 */
function startWindowDrag(e, win){

	// a title bar must never let a right-click bubble up & pan the desktop (that was a bug),
	// so we always swallow right-clicks here and do nothing else with them.
	if(e.which == 3){
		e.stopPropagation();
		return;
	}

	// only the left mouse button drags a floating window
	if(e.which != 1)
		return;

	// make sure window is on top
	sortWindowOnTop(win);

	// save our title bar
	MWITitleBarBeingDragged = e.target;
	
	// save initial x/y position of the window
	const startDragPos = {
		x: win.position.x,
		y: win.position.y,
	};

	// true whilst we're moving the window
	isDraggingMWIWindow.value = true;
	
	// save the window we're moving
	windowBeingDragged = win;

	// use our drag helper to move the window
	const dragHelper = props.frame.mgr.dragHelper;
	dragHelperCBRefID = dragHelper.dragStart(

		// during drag operation
		(dx, dy) => {

			// move window
			win.position.x = startDragPos.x - dx;
			win.position.y = startDragPos.y - dy;
		},

		// upon drag complete
		(dx, dy)=>{

			// we're done moving a window / clear refs
			isDraggingMWIWindow.value = false;
			windowBeingDragged = null;
		}
	);

}


/**
 * When a window is clicked in MWI mode, it's z-index needs to be put on top
 * 
 * @param {Window} win - the window to sort on top
 */
function sortWindowOnTop(win){

	// focus logic (z-order raise + focused-window tracking) lives on the frame now,
	// so the task bar and the contents stay in agreement about what's focused
	props.frame.focusWindow(win);
}


/**
 * Mouse-down on a window's container (the floating window as a whole).
 *
 * Raises the window, and - unless pan-from-window-body is explicitly enabled - prevents a
 * right-click over the window body from bubbling up and panning the MWI desktop. That keeps
 * right-click available to the user's own window-component by default.
 *
 * @param {Event} e - JavaScript Event Object
 * @param {Window} win - the window whose container was pressed
 */
function onContainerMouseDown(e, win){

	// always raise the clicked window to the top
	sortWindowOnTop(win);

	// swallow right-clicks over the body so they don't pan, unless the user opted in
	if(e.which == 3 && props.frame.mgr.mwiPanFromWindowBody.value != true)
		e.stopPropagation();
}


/**
 * Right-click on the MWI background. Since right-click here is "ours" (pan / start menu),
 * suppress the browser's context menu so it doesn't appear alongside our own.
 *
 * @param {Event} e - JavaScript Event Object
 */
function onBgContextMenu(e){

	// only claim right-click for MWI frames; other frame styles keep default behavior
	if(props.frame.frameStyle.value == WindowFrame.STYLE.MWI)
		e.preventDefault();
}


/**
 * Right-click on a window body. Unless pan-from-window-body is enabled, keep the event
 * with the window-component (stop it from reaching the background's preventDefault) so the
 * component can show its own context menu.
 *
 * @param {Event} e - JavaScript Event Object
 */
function onContainerContextMenu(e){

	if(props.frame.frameStyle.value == WindowFrame.STYLE.MWI
		&& props.frame.mgr.mwiPanFromWindowBody.value != true)
		e.stopPropagation();
}


/**
 * When in MWI mode, the close button is like the close tab button, for a floating window
 * 
 * @param {Window} win - the window to close
 */
function closeWindow(win){

	// just use our frame's remove window method
	props.frame.removeWindow(win);
}


/**
 * Minimizes an MWI window (hides it; it stays recoverable from the task bar).
 *
 * @param {Event} e - JavaScript Event Object
 * @param {Window} win - the window to minimize
 */
function minimizeWindow(e, win){

	// don't let this also start a title-bar drag
	e.stopPropagation();

	// minimize via the window's own method
	win.minimize();
}


/**
 * Opens the add-window "start" menu at the cursor (used by the floating start button).
 *
 * @param {Event} e - JavaScript Event Object
 */
function openStartMenu(e){
	showAddWindowMenu(props.frame.mgr, props.frame, e.x, e.y);
}


/**
 * Cascades windows that don't yet have an x/y position from top-left
 * 
 * @param {Array<Window>} windows - array of windows to lay out
 */
function cascadeWindows(windows){

	// reset our cascade counter
	const moveDistance = 30;
	// cascadeSpawnPos = moveDistance;

	// loop over windows and assign position for their x/y if null
	for(let i=0; i<windows.length; i++){

		const win = windows[i];
		
		if(win.position.x==null){
			win.position.x = cascadeSpawnPos;
			win.position.y = parseInt(cascadeSpawnPos*1.5);
			win.position.z = cascadeSpawnPos;
			cascadeSpawnPos += moveDistance;
		}

	}// next i
}


/**
 * Gets a class name for the current window container
 * 
 * @returns {String} - the class name
 */
function getContainerClassName(frame){
	switch(frame.frameStyle.value){
	case WindowFrame.STYLE.MWI:
		return 'frame_mwi';
	case WindowFrame.STYLE.SINGLE:
		return 'frame_single';
	case WindowFrame.STYLE.TABBED:
		return 'frame_tabbed';
	default:
		return 'frame_single';
	}
}


/**
 * Get's a boolean if we should show this window container
 * 
 * @param {Window} win - check if we should show this window container
 * @returns {Boolean} - true if should set it.
 */
function shouldShowFrame(win){
	
	// I could write this in one big logic statement, but three if's is easier to read

	// in MWI mode, show every window EXCEPT the ones that are minimized
	if(props.frame.frameStyle.value == WindowFrame.STYLE.MWI)
		return win.minimized.value != true;

	// there is only one container in single mode, so should always show
	if(props.frame.frameStyle.value == WindowFrame.STYLE.SINGLE)
		return true;

	// if it's not MWI or SINGLE, then we should only show the one that matches the
	// active tab
	if(win.windowID==props.frame.currentTab.value)
		return true;

	// otherwise, false - don't show this window container
	return false;
}


/**
 * Gets an object for a windows specific styles
 * 
 * @param {Window} win - window to generate CSS style object for
 * @returns {Object} with CSS keys for positioning the frame
 */
function getContainerStyle(win){

	// return full screen style unless we're in MWI
	if(props.frame.frameStyle.value != WindowFrame.STYLE.MWI){

		return {
			inset: '0px 0px 0px 0px',
			width: 'auto',
			height: 'auto'
		};

	}else{

		return {
			left: `${win.position.x}px`,
			top: `${win.position.y}px`,
			width: `${win.size.width}px`,
			height: `${win.size.height}px`,
			'z-index': `${win.position.z}`,
		};
	}
}


/**
 * Helper method to set the window's element after it's container has mounted
 * 
 * @param {HTMLElement} el - reference to the mounted element
 * @param {Window} win - the window it was mounted for
 */
function setRef(el, win){

	// console.log('Setting ref', el);
	win.domContainer.value = el;
}

// http://localhost:5173/icons/mwi_dot.png

</script>
<style lang="scss" scoped>

	// window contents will spawn in the frame contents region
	.frameContents {

		// fill entire parent container, except for header
		position: absolute;
		inset: 25px 0px 0px 0px;

		// keep our internal stacking (floating windows + task bar) self-contained, so their
		// z-indexes don't leak up to the body level and paint over teleported context menus.
		isolation: isolate;

		// for debug
		// border: 1px solid greenyellow;

		// allow nothing to escape
		overflow: clip;

		// move to top if no header (aka MWI frame )
		&.noHeader {
			top: 0px;

			background: var(--theme-mwiBGColor);
			background-image: var(--bg-image);
			/* background-image: url(../assets/img/mwi_bg.png); */
			/* background-image: url('/mwi_dot.png'); */
			/* background-image: url('../assets/img/mwi_bg.png'); */
			background-repeat: repeat;

			.dragLayer {
				position: absolute;
				overflow: visible;
				left: 0px;
				top: 0px;
			}

		}// &.noHeader

		// true when we're dragging
		&.isDragging {
			cursor: move;
		}

		// the floating "start" button (MWI start menu when the task bar is off)
		.floatingStartButton {

			// bottom-left, above the windows & inner shadow (within the frame's isolated stacking)
			position: absolute;
			left: 10px;
			bottom: 10px;
			z-index: 1000;

			width: 34px;
			height: 34px;

			border-radius: 8px;
			cursor: pointer;

			background: var(--theme-frameTabsActiveColor);
			border: 1px solid rgba(255, 255, 255, 0.2);

			display: flex;
			align-items: center;
			justify-content: center;

			filter: drop-shadow(2px 2px 3px rgba(0, 0, 0, 0.5));

			&:hover {
				background: var(--theme-menuActiveBGColor);
			}

			.startIcon {

				// a simple 2x2 "window" glyph
				width: 16px;
				height: 16px;
				border: 2px solid var(--theme-activeTabTextColor);
				border-radius: 2px;
				position: relative;

				&::after {
					content: '';
					position: absolute;
					inset: 3px 3px 3px 3px;
					border-left: 2px solid var(--theme-activeTabTextColor);
					border-top: 2px solid var(--theme-activeTabTextColor);
				}
			}// .startIcon

		}// .floatingStartButton

		// the layer that drags when in MWI mode
		.dragLayer {

			// styles for the containers windows will dock to
			.windowContentsContainer {

				// always positioned manually
				position: absolute;

				// allow no contents to escape
				overflow: clip;

				// for debug
				// border: 1px solid red;

				// by default, the title bar is not visible
				.titleBar {
					user-select: none;
					display: none;

					cursor: move;

					// optional icon
					.icon {

						// for debug
						/* border: 1px solid red; */

						// don't interfere with text selection
						pointer-events: none;

						// on left
						position: absolute;
						left: 4px;
						top: 2px;

						// fixed size
						width: 22px;
						height: 22px;

						// background settings
						background-size: cover;
						background-repeat: no-repeat;
						background-position: center center;

					}// .icon

					// the title text, centered
					.titleText {

						// fill container
						position: absolute;
						inset: 0px 0px 0px 0px;

						// don't interfere with dragging
						pointer-events: none;

						// move text down a bit
						padding-top: 4px;
						// text settings
						text-align: center;
						font-size: 14px;
						letter-spacing: 0.8px;
						color: var(--theme-windowTitleTextColor);
					
					}// .titleText

					// the close button
					.closeButton {

						// fixed in the space on the right
						position: absolute;
						top: 4px;
						right: 4px;

						background: var(--theme-closeButtonCircle);

						// text setting
						font-size: 12px;
						color: var(--theme-closeButtonXColor);

						border-radius: 100px;
						width: 14px;
						height: 14px;

						// don't be move cursor
						cursor: default;

						// the actual X lives in a span:
						span {
							position: relative;
							left: 2px;
							top: -1px;
						}// span

						// hover styles
						&:hover {

							background: var(--theme-closeButtonCircleHover);
							color: var(--theme-closeButtonXColorHover);

						}//&:hover

					}// close button

					// the minimize button (sits just left of the close button)
					.minimizeButton {

						// fixed in the space on the right, left of the close button
						position: absolute;
						top: 4px;
						right: 22px;

						background: var(--theme-closeButtonCircle);

						// text setting
						font-size: 12px;
						line-height: 1;
						color: var(--theme-closeButtonXColor);

						border-radius: 100px;
						width: 14px;
						height: 14px;

						// don't move cursor
						cursor: default;

						// center the minus glyph in the circle (like the close button's X)
						display: flex;
						align-items: center;
						justify-content: center;
						span {
							position: relative;
							top: -1px;
						}// span

						// hover styles
						&:hover {

							background: var(--theme-closeButtonCircleHover);
							color: var(--theme-closeButtonXColorHover);

						}//&:hover

					}// minimize button

				}// .titleBar

				// by default window contents takes entire area
				.windowContents {

					position: absolute;
					inset: 0px 0px 0px 0px;

				}// .windowContents

				// styles for when the window specifically is in MWI mode
				&.frame_mwi {
					
					// thick round border
					border: 3px solid black;
					border-radius: 8px;

					// floating windows will have _shadow_!
					filter: drop-shadow(5px 5px 4px rgba(0, 0, 0, 0.5));

					// when in MDI mode, title bar is fixed along top
					.titleBar {
						display: block;

						position: absolute;
						inset: 0px 0px auto 0px;
						height: 25px;

						/* background: #5C5C60; */
						background: var(--theme-frameHeaderColor);
						
					}// .title bar

					// move the container down when 
					// by default window contents takes entire area
					.windowContents {

						inset: 25px 0px 0px 0px;

					}// .windowContents

				}// &.frame_mwi

				// the drag handles when we're in MWI mode
				.mwiResizeHandle {

					// don't try to start a text select
					user-select: none;

					// fixed position for our handles
					position: absolute;
					inset: 0px 0px 0px 0px;
					
					&.top {
						bottom: auto;
						height: 3px;
						// background: greenyellow;
						cursor: ns-resize;
					}

					&.bottom {
						top: auto;
						height: 3px;
						// background: cyan;
						cursor: ns-resize;
					}

					&.left {
						right: auto;
						width: 3px;
						// background: red;
						cursor: ew-resize;
					}

					&.right {
						left: auto;
						width: 3px;
						// background: blue;
						cursor: ew-resize;
					}

					// common styles for the corners
					&.tl, &.tr, &.bl, &.br {
						width: 10px;
						height: 10px;
						// background: red;
					}

					&.tl {
						right: auto;
						bottom: auto;						
						cursor: nw-resize;
					}

					&.tr {
						left: auto;
						bottom: auto;
						cursor: ne-resize;
					}

					&.bl {
						right: auto;
						top: auto;
						cursor: sw-resize;
					}

					&.br {
						left: auto;
						top: auto;
						cursor: se-resize;
					}
				}// .mwiResizeHandle
				
			}// .windowContentsContainer

		}// .dragLayer

		// a layer that covers the entire window area to make it look "sunken" in via shadows
		.MWIInnerShadow {
			
			// always on top
			z-index: 100;

			// fill entire window container
			position: absolute;
			inset: 0px 0px 0px 0px;

			// don't interfere with cursor events
			pointer-events: none;

			// make the frame look deep when in MWI mode
			box-shadow: 0px 0px 10px 1px #000000 inset;			
			
		}// .MWIInnerShadow

	}// .frameContents


</style>
