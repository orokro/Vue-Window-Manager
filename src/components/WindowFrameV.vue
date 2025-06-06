<!--
	WindowFrameV.vue
	----------------

	This component creates a WindowFrame, which are "empty" containers that partition the
	screen real-estate. WindowFrames are what contain one or more Windows, in various configurations.

	See the large comment-block at the top of WindowManager.js for more info on our WindowingSystem.

	Specifically, this component will match one of the WindowFrame objects (WindowFrame.js) in our
	app's WindowManager (WindowManager.js).
-->
<template>
	
	<!-- main outer wrapper for a WindowFrame! -->
	<div 
		class="windowFrame"
		
		:class="{
			debug: windowMgr.useWindowingDebug==true,
			noHeader: frame.frameStyle.value==WindowFrame.STYLE.MWI,
		}"
		
		:style="{
			top: frame.screenPos.value.t + 'px',
			left: frame.screenPos.value.l + 'px',
			height: (frame.screenPos.value.b - frame.screenPos.value.t)  + 'px',
			width: (frame.screenPos.value.r - frame.screenPos.value.l) + 'px',				
		}"
	>
		
		<!-- we need an inner wrapper with clipping turned on, because our grab-handles can't be clipped -->
		<div class="innerWrapper">

			<!-- the header of the window frame. 
				In the future, this maybe able to be switched from top to bottom/left/right,
				but for now it's just a strip along the top. -->
			<WindowFrameHeader :frame="frame" @on-window-tear-off="handleTear"/>			

			<!-- the frame's options menu
				NOTE: not part of frameHeader because frameHeader is turned off in MWI mode -->
			<div 
				class="hamburgerMenu noSel"
				title="Click for Window Frame Options"
				@click="showHamburgerMenu"
			/>

			<!-- actual window frame content -->
			<WindowFrameContents :frame="frame" @on-window-tear-off="handleTear"/>

			<!-- this "curtain" will darken & deactivate frames when 
				just one is being focused in the window manager -->
			<div
				class="focusCurtain noSel"
				:class="{enabled: windowMgr.frameFocusID.value!=null && windowMgr.frameFocusID.value!=frame.frameID}"
				@mouseenter="handleSuperSplitMode"
			></div>

			<!-- this will be the arrow layer that shows when using the Blender-like merge handles -->
			<div
				class="mergeOverlay noSel"
				:class="{
					enabled: windowMgr.mergePreviewID.value!=null && windowMgr.mergePreviewID.value==frame.frameID,
					up: windowMgr.mergePreviewDirection.value == 'u',
					down: windowMgr.mergePreviewDirection.value == 'd',
					left:  windowMgr.mergePreviewDirection.value == 'l',
					right: windowMgr.mergePreviewDirection.value == 'r',
				}"
			>
				<div class="arrowGraphic"></div>
				<div class="darkenGraphic"></div>
			</div>

			
			<!-- this will be an invisible layer that shows a red-line for when split mode is active on this window -->
			<div
				v-if="frame.splitMode.value != WindowFrame.SPLIT_MODE.OFF"
				class="splitLayer"
				ref="splitLayerEl"
				:tabindex="0"
				@mousemove="positionSplitCursor"
				@blur="cancelSplit"
				@click="acceptSplit"
			>

				<!-- the red line that follows the cursor for splitting -->
				<div 
					class="splitCursorRedLine"
					:class="{
						horizontal: (frame.splitMode.value==WindowFrame.SPLIT_MODE.HORIZONTAL),
						vertical: (frame.splitMode.value==WindowFrame.SPLIT_MODE.VERTICAL)
					}"
					:style="{
						left: frame.splitMode.value==WindowFrame.SPLIT_MODE.HORIZONTAL ? '0px': `${splitPos-2}px`,
						top: frame.splitMode.value==WindowFrame.SPLIT_MODE.HORIZONTAL ? `${splitPos-2}px` : '0px',
					}"
				/>
			</div>

			<!-- if the user is-dragging-and-dropping a tab, these divs will be the drop-targets
				that we 'ray cast' for with document.elementFromPoint(x, y) -->
			<div
				v-if="windowMgr.windowDragSystem.isDragging.value==true"
				class="tabDropTargets"
			>

			
				<!-- drop target for the center -->
				<div 
					:frameID="frame.frameID" 
					class="dropTarget center"
					:class="{
						canSplitH: canSplit().h,
						canSplitV: canSplit().v,						
					}"
					region="frame"
				></div>

				<!-- drop targets for the main edges -->
				<div 
					v-if="canSplit().v==true"
					:frameID="frame.frameID" 
					class="dropTarget splitLeft"
					region="left"
				></div>
				<div 
					v-if="canSplit().v==true"
					:frameID="frame.frameID" 
					class="dropTarget splitRight"
					region="right"
				></div>
				<div 
					v-if="canSplit().h==true"
					:frameID="frame.frameID" 
					class="dropTarget splitTop"
					region="top"
				></div>
				<div 
					v-if="canSplit().h==true"
					:frameID="frame.frameID" 
					class="dropTarget splitBottom"
					region="bottom"
				></div>

			<!-- /. tabDropTargets-->
			</div>

		<!-- /.innerWrapper -->
		</div>

		<!-- the grab handles for resizing the frame -->
		<div
			class="grabHandle vertical left"
			:class="`${getEdgeStatus(WindowFrame.EDGE.LEFT)}`"
			@mousedown="startEdgeDrag(WindowFrame.EDGE.LEFT)"
			@contextmenu="e=>showEdgeContextMenu(e, WindowFrame.EDGE.LEFT, 'v')"
		></div>
		<div 
			class="grabHandle vertical right"
			:class="`${getEdgeStatus(WindowFrame.EDGE.RIGHT)}`"
			@mousedown="startEdgeDrag(WindowFrame.EDGE.RIGHT)"
			@contextmenu="e=>showEdgeContextMenu(e, WindowFrame.EDGE.RIGHT, 'v')"
		></div>
		<div 
			class="grabHandle horizontal top"
			:class="`${getEdgeStatus(WindowFrame.EDGE.TOP)}`"
			@mousedown="startEdgeDrag(WindowFrame.EDGE.TOP)"
			@contextmenu="e=>showEdgeContextMenu(e, WindowFrame.EDGE.TOP, 'h')"
		></div>
		<div
			class="grabHandle horizontal bottom"
			:class="`${getEdgeStatus(WindowFrame.EDGE.BOTTOM)}`"
			@mousedown="startEdgeDrag(WindowFrame.EDGE.BOTTOM)"
			@contextmenu="e=>showEdgeContextMenu(e, WindowFrame.EDGE.BOTTOM, 'h')"
		></div>

		<!-- the Blender-like 2.79 merge/split handles in the four corners -->
		<div
			v-if="windowMgr.showBlenderSplitMergeHandles.value==true"
			class="mergeHandle TL"
			@mousedown="startSplitMergeDrag(WindowFrame.EDGE.TOP, WindowFrame.EDGE.LEFT)"
		></div>
		<div
			v-if="windowMgr.showBlenderSplitMergeHandles.value==true"
			class="mergeHandle TR"
			@mousedown="startSplitMergeDrag(WindowFrame.EDGE.TOP, WindowFrame.EDGE.RIGHT)"
		></div>
		<div
			v-if="windowMgr.showBlenderSplitMergeHandles.value==true"
			class="mergeHandle BL"
			@mousedown="startSplitMergeDrag(WindowFrame.EDGE.BOTTOM, WindowFrame.EDGE.LEFT)"
		></div>
		<div
			v-if="windowMgr.showBlenderSplitMergeHandles.value==true"
			class="mergeHandle BR"
			@mousedown="startSplitMergeDrag(WindowFrame.EDGE.BOTTOM, WindowFrame.EDGE.RIGHT)"
		></div>
		
	</div>

</template>
<script setup>

// vue
import { ref, watch, inject } from 'vue';
import ContextMenu from '@imengyu/vue3-context-menu';

// components
import WindowFrameHeader from './WindowFrameHeader.vue';
import WindowFrameContents from './WindowFrameContents.vue';

// lib/misc
import { clamp } from '@misc/Utils';
import WindowManager from '@classes/WindowManager';
import WindowFrame from '@classes/WindowFrame';
import Window from '@classes/Window';

// get our local components window manager
const windowMgr = inject('windowManager');

// x/y position for positioning the split cursor
const splitPos = ref(0);

// ref to split layer
const splitLayerEl = ref(null);

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


// watch our split-mode & focus the frame automatically if we enter a split mode
watch(
	()=>props.frame.splitMode.value,
	()=>{ 
		if(props.frame.splitMode.value != WindowFrame.SPLIT_MODE.OFF)
			setTimeout(()=>splitLayerEl.value?.focus(), 10);
	}
);


/**
 * Handle when either our header or content window initiates a tear
 * 
 * @param {Object} tearData - data about the tear operation
 */
function handleTear(tearData){

	// reraise event
	emits('onWindowTearOff', tearData);
}


/**
 * Gets a class name based on an edge's neighbor status
 * 
 * @param {Number} edge - one of the WindowFrame.EDGE_NEIGHBOR_STATUS values
 */
function getEdgeStatus(edge) {


	// get the edge status as stored on the window frame itself:
	const edgeStatus = props.frame.neighborStatus[edge];

	// convert to a CSS class name
	const values = {};
	values[WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED] = 'undetermined_edge';
	values[WindowFrame.EDGE_NEIGHBOR_STATUS.EXTREMITY] = 'extremity_edge';
	values[WindowFrame.EDGE_NEIGHBOR_STATUS.PARTIAL] = 'partial_edge';
	values[WindowFrame.EDGE_NEIGHBOR_STATUS.ADJACENT] = 'adjacent_edge';
	let className = values[edgeStatus];	

	// check if this edge is selected, if so, use that instead
	let selectedEdges = [...windowMgr.selectedEdges.value];
	selectedEdges = selectedEdges.filter(i => i.frame == props.frame);
	if(selectedEdges.length>0){

		// if the selected edge is the one we're being asked about..
		const selectedEdge = selectedEdges[0].edge;
		if(selectedEdge==edge)
			className = 'selected_edge';
	}

	return className;
}


/**
 * Helper function to see if a window can be merged on one of it's edges
 * 
 * @param {String} edge - OPTIONAL; one of the WindowFrame.EDGE constants. If omitted, all four edges will be tested
 * @returns {Boolean} true if it can be merged on this edge
 */
function canMerge(edge){

	// if edge is undefined, we'll test all four edges instead:
	if(edge==undefined){

		const t = canMerge(WindowFrame.EDGE.TOP);
		const b = canMerge(WindowFrame.EDGE.BOTTOM);
		const l = canMerge(WindowFrame.EDGE.LEFT);
		const r = canMerge(WindowFrame.EDGE.RIGHT);

		return t || b || l || r;
	}else{
		return props.frame.neighborStatus[edge]==WindowFrame.EDGE_NEIGHBOR_STATUS.ADJACENT;
	}
}


/**
* Helper function to return if our frame is big enough to be split
* @returns {Object} like { h: <Boolean>, b: <Boolean> } if it can be split horizontally or vertically
*/
function canSplit(){

	// in order for a frame to be able to be split, it must be at least bigger than
	// DOUBLE the minimum size, because otherwise spitting it would create an invalid window on one
	// half of the window
	const minSplitSize = WindowManager.SMALLEST_WIDTH_OR_HEIGHT * 2;

	// get our frames dimensions
	const frameDimensions = props.frame.getFrameDim();

	// return an object with booleans for splitability on horizontal/vertical dimensions
	return {
		h: frameDimensions.height > minSplitSize,
		v: frameDimensions.width > minSplitSize,
		neither: !(frameDimensions.height > minSplitSize) && !(frameDimensions.width > minSplitSize)
	};
}


/**
 * Handles right click on edge
 * 
 * @param {Event} e - JS Event Object
 * @param {String} edge - one of the WindowFrame.EDGE constants
 * @param {String} dir - either 'h' or 'v' for split orientation
 */
function showEdgeContextMenu(e, edge, dir){

	// build & show the context menu for this WindowFrame
	ContextMenu.showContextMenu({
		x: e.x,
		y: e.y,
		theme: 'mac',
		items: [
			{
				label: 'Split Vertically',
				hidden: dir=='v',
				disabled: canSplit().v==false,
				svgIcon: '#iconVSplit',
				onClick: ()=>splitFrame('v', true)
			},
			{
				label: 'Split Horizontally',
				hidden: dir=='h',
				disabled: canSplit().h==false,
				svgIcon: '#iconHSplit',
				onClick: ()=>splitFrame('h', true)
			},
			{
				label: 'Merge Left',
				hidden: canMerge(edge)==false || dir=='h',
				// svgIcon: '#iconMergeLeft',
				svgIcon: '#iconVSplit',
				onClick: ()=>mergeFrame(edge, (edge==WindowFrame.EDGE.RIGHT))
			},
			{
				label: 'Merge Right',
				hidden: canMerge(edge)==false || dir=='h',
				// svgIcon: '#iconMergeLeft',
				svgIcon: '#iconVSplit',
				onClick: ()=>mergeFrame(edge, (edge==WindowFrame.EDGE.LEFT))
			},
			{
				label: 'Merge Up',
				hidden: (canMerge(edge)==false) || dir=='v',
				// svgIcon: '#iconMergeUp',
				svgIcon: '#iconHSplit',
				onClick: ()=>mergeFrame(edge, (edge==WindowFrame.EDGE.BOTTOM))
			},
			{
				label: 'Merge Down',
				hidden: (canMerge(edge)==false) || dir=='v',
				// svgIcon: '#iconMergeUp',
				svgIcon: '#iconHSplit',
				onClick: ()=>mergeFrame(edge, (edge==WindowFrame.EDGE.TOP))
			},
		],
	});
	
}


/**
 * Show's the hamburger menu
 *
 * @param {Event} e - the ui event
 */
function showHamburgerMenu(e) {

	// pick which icon should be used for the "Frame Mode" menu, based on our current frame's mode/style
	const iconMap = {};
	iconMap[WindowFrame.STYLE.SINGLE] = 'iconFrameSingle';
	iconMap[WindowFrame.STYLE.TABBED] = 'iconFrameTabbed';
	iconMap[WindowFrame.STYLE.MWI] = 'iconFrameMWI';
	const frameIcon = `#${iconMap[props.frame.frameStyle.value]}`;

	// build the name of the string we should use for the view menu
	const frameStyle = props.frame.frameStyle.value;
	let frameStyleString = 'Add Tab';
	if(frameStyle==WindowFrame.STYLE.SINGLE)
		frameStyleString = 'Switch View';
	if(frameStyle==WindowFrame.STYLE.MWI)
		frameStyleString = 'Add Window';

	// build & show the context menu for this WindowFrame
	ContextMenu.showContextMenu({
		x: e.x,
		y: e.y,
		theme: 'mac',
		items: [
			{
				label: frameStyleString,
				svgIcon: frameIcon,
				// hidden: true,
				children: windowMgr.availableWindowList.getWindows().map(window =>{
					return {
						label: window.title,
						// svgIcon: data.svgIcon,
						onClick: ()=>addWindow(window.slug)
					}
				}),
			},
			{
				label: 'Frame Mode',
				svgIcon: frameIcon,
				children: [
					{
						label: 'Tabbed',
						onClick: ()=>setFrameStyle(WindowFrame.STYLE.TABBED),
						checked: (props.frame.frameStyle.value == WindowFrame.STYLE.TABBED),
					},
					{
						label: 'Single Window',
						onClick: ()=>setFrameStyle(WindowFrame.STYLE.SINGLE),
						checked: (props.frame.frameStyle.value == WindowFrame.STYLE.SINGLE),
					},
					{
						label: 'Floating Windows',
						onClick: ()=>setFrameStyle(WindowFrame.STYLE.MWI),
						checked: (props.frame.frameStyle.value == WindowFrame.STYLE.MWI),
					},					
				]
			},
			{
				label: 'Split Frame...',
				disabled: canSplit().neither,
				svgIcon: '#iconSplitFrame',
				children: [
					{
						label: 'Vertically',
						disabled: canSplit().v==false,
						svgIcon: '#iconVSplit',
						onClick: ()=>splitFrame('v', true)
					},
					{
						label: 'Horizontally',
						disabled: canSplit().h==false,
						svgIcon: '#iconHSplit',
						onClick: ()=>splitFrame('h', true)
					}
				]	 
			},
			{
				label: 'Merge Frame...',
				disabled: canMerge()==false,
				svgIcon: '#iconMergeRight',
				children: [
					{
						label: 'Merge Left',
						disabled: canMerge(WindowFrame.EDGE.LEFT)==false,
						svgIcon: '#iconMergeLeft',
						onClick: ()=>mergeFrame(WindowFrame.EDGE.LEFT)
					},
					{
						label: 'Merge Right',
						disabled: canMerge(WindowFrame.EDGE.RIGHT)==false,
						svgIcon: '#iconMergeRight',
						onClick: ()=>mergeFrame(WindowFrame.EDGE.RIGHT)
					},
					{
						label: 'Merge Up',
						disabled: canMerge(WindowFrame.EDGE.TOP)==false,
						svgIcon: '#iconMergeUp',
						onClick: ()=>mergeFrame(WindowFrame.EDGE.TOP)
					},
					{
						label: 'Merge Down',
						disabled: canMerge(WindowFrame.EDGE.BOTTOM)==false,
						svgIcon: '#iconMergeDown',
						onClick: ()=>mergeFrame(WindowFrame.EDGE.BOTTOM)
					}
				]
			}			
		],
	});
}


/**
 * Adds a - ̗̀ new ̖́- Window to our frame
 * 
 * @param {String} kind - one of the names in our available window array
 */
function addWindow(kind){

	const newWin = windowMgr.createWindow(kind);
	props.frame.addWindow(newWin);
}


/**
 * Sets the WindowFrame's style / mode of operation
 * 
 * @param {Number} style - one of our WindowFrame.STYLE cons
 */
function setFrameStyle(style){
	props.frame.frameStyle.value = style;
}


/**
 * When the mouse is over one of our curtains, check if we're in super split mode
 * 
 * SSM lets the split operation cary over to other windows that the one that initially started it
 */
function handleSuperSplitMode(){

	// get split mod details
	const splitMode = windowMgr.splitModeDetails.value;

	// guard clauses
	if(splitMode==null)
		return;
	if(splitMode.superSplitMode==false)
		return;

	// if we were in SSR, then we can:
	// - 1. record the split axis
	// - 2. check if we can be split on said axis
	// - 3. if so, cancel current operation
	// - 4. then start new operation with our self on the same axis

	// 1
	const splitAxis = splitMode.axis;

	// 2
	const eligibleForSSRAxis =
		(splitAxis==WindowFrame.SPLIT_MODE.VERTICAL && canSplit().v==true)
		||
		(splitAxis==WindowFrame.SPLIT_MODE.HORIZONTAL && canSplit().h==true);

	// gtfo if we're not eligible
	if(eligibleForSSRAxis==false)
		return;

	// 3
	windowMgr.endFrameSplit(false);

	// 5
	setTimeout(()=>{
		const splitStr = (splitAxis==WindowFrame.SPLIT_MODE.VERTICAL) ? 'v' : 'h';
		splitFrame(splitStr, true);
	}, 20);
}


/**
 * Starts a split-operation on the Window Frame.
 * @param {String} dir - literally the string 'h' for horizontal, or 'v' for vertical. Nothing else allowed.
 * @param {Boolean} superSplitMode - OPTIONAL; turn on super split mode, default = false
 */
function splitFrame(dir, superSplitMode){

	// console.log(`${props.frame.frameID} says split on "${dir}"`);

	// handle optional parameter
	superSplitMode = superSplitMode===undefined ? false : superSplitMode;

	// convert dir from String to one of our numerical modes
	dir = dir.toUpperCase();
	dir = ({
		H: WindowFrame.SPLIT_MODE.HORIZONTAL,
		V: WindowFrame.SPLIT_MODE.VERTICAL
	})[dir];

	// hide split cursor till mouse over
	splitPos.value = -10;

	// start the split process
	windowMgr.startFrameSplit(props.frame, dir, superSplitMode);
}


/**
 * Handle when the mouse is over our split-layer
 * 
 * @param {Event} e - JavaScript event object
 */
function positionSplitCursor(e){

	// update split mode pos
	const isHorizontal = props.frame.splitMode.value==WindowFrame.SPLIT_MODE.HORIZONTAL;
	let pos = isHorizontal 
		? 
		(e.y - props.frame.screenPos.value.t - windowMgr.pos.screenPos.y)
		: 
		(e.x - props.frame.screenPos.value.l - windowMgr.pos.screenPos.x);

	// the smallest allowed width or height of a window, for now
	const smallestAllowedWidthOrHeight = WindowManager.SMALLEST_WIDTH_OR_HEIGHT;

	// compute window frame dimensions
	const fPos = props.frame.screenPos.value;
	const frameWidth = fPos.r - fPos.l;
	const frameHeight = fPos.b - fPos.t;

	// compute min & max allowed
	const min = smallestAllowedWidthOrHeight;
	const max = isHorizontal ? (frameHeight-smallestAllowedWidthOrHeight) : (frameWidth-smallestAllowedWidthOrHeight);

	// snap it
	pos -= (pos % WindowManager.SNAP_SIZE);

	// clamp it between our min & max
	splitPos.value = clamp(pos, min, max);

	// make sure the element is focused:
	splitLayerEl.value.focus();
}


/**
 * Cancels the WindowFrame split operation when our element loses focus
 */
function cancelSplit(){

	// just tell WindowManager to cancel that split
	if(props.frame.splitMode.value != WindowFrame.SPLIT_MODE.OFF)
		windowMgr.endFrameSplit(false);
}


/**
 * Confirms the split selection
 */
function acceptSplit(){
	windowMgr.endFrameSplit(true, {splitPos: splitPos.value});
}


/**
 * Tells window manager to attempt resize when dragging from an edge
 * @param {String} edge - one of the WindowFrame.EDGE types
 */
function startEdgeDrag(edge){

	// make sure it's a valid edge to drag..
	if(props.frame.neighborStatus[edge]==WindowFrame.EDGE_NEIGHBOR_STATUS.UNDETERMINED)
		return;
	if(props.frame.neighborStatus[edge]==WindowFrame.EDGE_NEIGHBOR_STATUS.EXTREMITY)
		return;
	
	// tell the window manager to start dragging all connected edges
	windowMgr.startDrag(props.frame, edge);
}


/**
 * Merges a window frame
 * 
 * @param {String} edge - one of our WindowFrame.EDGE constants
 * @param {Boolean} other - OPTIONAL; 
 */
function mergeFrame(edge, other){

	// handle optional parameter
	other = (other===undefined) ? false : other;

	// double check we can actually do this merge
	if(canMerge(edge)==false){
		console.error('Tried an impossible merge, this should never have happened');
		return;
	}
	
	// to merge
	let frame = props.frame;

	// if we're in other mode, we instead have to merge the other window, into us
	if(other){
		frame = props.frame.neighbors[edge];
		edge = WindowFrame.getOppositeEdge(edge);
	}

	// just call the merge on our window mgr
	windowMgr.mergeWindowFrames(frame, edge);
}


/**
 * Tells window manager to show a preview of a merge
 * 
 * @param {String|undefined} edge - the edge to preview a merge with, or if omitted, preview will be cleared
 */
function previewMerge(edge){

	// if edge is undefined, clear preview
	if(edge===undefined){
		windowMgr.mergePreviewID.value = null;
		windowMgr.mergePreviewDirection.value = null;
		return;
	}

	// make sure we can merge on that edge:
	if(canMerge(edge)==false)
		return;

	// get that neighbor:
	const neighbor = props.frame.neighbors[edge];

	// convert edge to direction
	const dir = edge.replace('t', 'u').replace('b', 'd');

	// tell our window manager to preview a merge with this direction
	windowMgr.mergePreviewID.value = neighbor.frameID;
	windowMgr.mergePreviewDirection.value = dir;
}


/**
 * Starts monitoring mouse input for dragging one of the corners,
 * to potentially start a split or merge operation
 * 
 * @param {String} hSide - the horizontal edge, either TOP or BOTTOM on WindowFrame.EDGE
 * @param {String} vSide - the vertical edge, either LEFT or RIGHT on WindowFrame.EDGE
 */
function startSplitMergeDrag(hSide, vSide){
	
	/*
		Right, so this is a bit confusing so here's a comment block for ya'

		When the user clicks and drags on a corner, we will measure how far their mousemove.
		Once it moves past a minimum distance (the threshold) we will start EITHER
		a split operation OR a merge operation.

		For example, if the user drags RIGHT from the Top Right corner, they want to MERGE RIGHT.
		But, if they drag LEFT from the Top Right corner, they want to SPLIT VERTICALLY.

		Basically, depending on the corner the user clicked and dragged, there's four options.
		Again for top right:
			- UP: merge up
			- RIGHT: merge right
			- DOWN: split horizontally
			- LEFT: split vertically

		Now each corner has a different set of options

		Further, splitting and merging still has to observe the same rules as splitting and merging
		with the hamburger menu. I.E. invalid split options or merge options just wont start.

		Okay, so before we actually start the drag operation, we'll decide what the U/D/L/R operations
		entail, so we don't have to figure it later.

		Lastly, if we enter one of the four directional modes, we should also have it be cancelled
		by going the other direction. So each mode will also provide a cancel function that
		can be used to test the cancellation.
	*/

	// object we'll use to build for all directions
	// for now we'll put the universal hardCoded cancel functions in
	const directionalOps = {
		u: { cancelFn: (dx, dy)=>dy > 0 },
		d: { cancelFn: (dx, dy)=>dy < 0 },
		l: { cancelFn: (dx, dy)=>dx > 0 },
		r: { cancelFn: (dx, dy)=>dx < 0 },
	};

	if(hSide==WindowFrame.EDGE.TOP){
		
		directionalOps.u.opFn =
			canMerge(WindowFrame.EDGE.TOP) ? ()=>{ previewMerge(WindowFrame.EDGE.TOP); return false; } : null;
		directionalOps.u.completeFn = ()=>{ mergeFrame(WindowFrame.EDGE.TOP); };

		directionalOps.d.opFn =
			canSplit().h ? ()=>{ splitFrame('h'); return true; } : null;
		directionalOps.d.completeFn = ()=>{ acceptSplit(); };
	}else {

		directionalOps.u.opFn =
			canSplit().h ? ()=>{ splitFrame('h'); return true; } : null;
		directionalOps.u.completeFn = ()=>{ acceptSplit(); };

		directionalOps.d.opFn =
			canMerge(WindowFrame.EDGE.BOTTOM) ? ()=>{ previewMerge(WindowFrame.EDGE.BOTTOM); return false; } : null;
		directionalOps.d.completeFn = ()=>{ mergeFrame(WindowFrame.EDGE.BOTTOM); };
	}

	if(vSide==WindowFrame.EDGE.LEFT){
		
		directionalOps.l.opFn =
			canMerge(WindowFrame.EDGE.LEFT) ? ()=>{ previewMerge(WindowFrame.EDGE.LEFT); return false; } : null;
		directionalOps.l.completeFn = ()=>{ mergeFrame(WindowFrame.EDGE.LEFT); };

		directionalOps.r.opFn =
			canSplit().v ? ()=>{ splitFrame('v'); return true; } : null;
		directionalOps.r.completeFn = ()=>{ acceptSplit(); };

	}else {

		directionalOps.l.opFn =
			canSplit().v ? ()=>{ splitFrame('v'); return true; } : null;
		directionalOps.l.completeFn = ()=>{ acceptSplit(); };

		directionalOps.r.opFn =
			canMerge(WindowFrame.EDGE.RIGHT) ? ()=>{ previewMerge(WindowFrame.EDGE.RIGHT); return false; } : null;
		directionalOps.r.completeFn = ()=>{ mergeFrame(WindowFrame.EDGE.RIGHT); };
	}

	// true if we're within the drag threshold during the drag operation
	let withinThreshold = true;

	// the function to duse upon completion
	let completeFunction = null;

	// the last direction we found & the direction the current operation was started on
	let lastDir = null;
	let opDir = null;

	/**
	 * Starts the operation and sets some of our scoped variables
	 * 
	 * @param {String} dir - either 'u', 'd', 'l', ir 'r'
	 */
	const startOp = (dir)=>{

		const { opFn, cancelFn, completeFn } = directionalOps[dir];

		// if there's no operation for this direction, do nothing
		if( opFn==null )
			return;

		// save direction we started on
		opDir = dir;
					
		// save our cancel and complete functions
		completeFunction = completeFn;

		// do whatever operation was requested for this direction
		opFn();
	};

	/**
	 * cancels drag operation & clears operation variables
	 */
	const cancelOp = ()=>{
		windowMgr.endFrameSplit(false);
		previewMerge();
		completeFunction = null;
		opDir = null;
	};
	

	// start drag operation
	const dragHelper = windowMgr.dragHelper;
	dragHelper.dragStart(

		// function called whilst computing the drag
		(dx, dy)=>{

			// invert dx/dy because right is - for some reason, etc
			dx *= -1;
			dy *= -1;

			// compute if we're inside the threshold or not, and if we changed status
			const wasWithingThreshold = withinThreshold;
			withinThreshold = Math.sqrt((dx*dx) + (dy*dy)) <= WindowManager.SPLIT_MERGE_DRAG_THRESHOLD;
			const thresholdStatusChanged = wasWithingThreshold!=withinThreshold;
			const leftThreshold = thresholdStatusChanged && !withinThreshold;
			const enteredThreshold = thresholdStatusChanged && withinThreshold;

			// cancel everything if we entered threshold
			if(enteredThreshold){
				cancelOp();
				return;
			}

			// figure out the logical direction the cursor is is based on it's distance from center
			const isHorizontalOperation = Math.abs(dx) >= Math.abs(dy);
			let dir = isHorizontalOperation ? (dx<0 ? 'l' : 'r') : (dy<0 ? 'u' : 'd');
			dir = withinThreshold ? null : dir;
			const dirChanged = dir!=lastDir;
			lastDir = dir;

			// if we left the threshold, start whatever initial operation is
			if(leftThreshold==true && opDir==null){
				cancelOp();
				startOp(dir);
				return;
			}			

			// if we're already have an operation direction, see if it changed on just that directions axis
			let dirFlipped =
				(opDir=='l' && dx>0)
				||
				(opDir=='r' && dx<0)
				||
				(opDir=='u' && dy>0)
				||
				(opDir=='d' && dy<0);

			// any time our direction changed, switch operations
			if(withinThreshold==false && dirFlipped==true){

				// get opposite direction
				let oppositeDir = null;
				oppositeDir = (opDir=='r' ? 'l' : oppositeDir);
				oppositeDir = (opDir=='l' ? 'r' : oppositeDir);
				oppositeDir = (opDir=='u' ? 'd' : oppositeDir);
				oppositeDir = (opDir=='d' ? 'u' : oppositeDir);

				cancelOp();
				startOp(oppositeDir);
				return;
			}			

		},
		
		// function when drag is done
		(dx, dy)=>{

			// if we have a completion function, call that now
			if(completeFunction!=null){
				completeFunction();
			}

			// clear up otherwise
			cancelOp();
		}
	);

}


</script>
<style lang="scss" scoped>

	// pull in our global reusable styles & variables
	@import '../css/main.scss';

	// the main WindowFrame outer wrapper
	.windowFrame {

		// default bg color
		background-color: #737378;

		// absolutely positioned inside our parent WindowingSystem.vue's container
		position: absolute;

		// force box sizing
		box-sizing: border-box;

		// frame border between our window frames w/ subtle rounding
		border: 2px solid black;
		border-radius: 8px;

		// inner wrapper with clipping turned on, but sibling to grab-handles
		.innerWrapper {

			// fill container
			position: absolute;
			inset: 0px 0px 0px 0px;
			border-radius: 7px;

			// no
			overflow: clip;

			// the hamburger menu that shows WindowFrame options
			.hamburgerMenu {

				// always on top-right corner for now.
				// potentially in future, we'll allow the header/menu to be positioned
				position: absolute;
				top: 3px;
				right: 3px;
				width: 19px;
				height: 19px;
				z-index: 99;

				// make gray circle
				border-radius: 100px;
				// background-color: rgba(255, 255, 255, 0.15);
				background-image: url('../assets/img/borger.png');
				background-size: contain;

				// appear clickable to user
				cursor: pointer;

				// hover stylez
				&:hover {
					background-color: rgba(255, 255, 255, 0.25);
				}// &:hover


			}// .hamburgerMenu

			// a curtain always on top to gray out the contents of this frame
			.focusCurtain {

				// fill container on top
				position: absolute;
				inset: 0px 0px 0px 0px;
				z-index: 99;

				// transparent dark back
				background: rgba(0, 0, 0, 0.4);

				// for animating in/out
				opacity: 0;
				transition: opacity 200ms ease-in-out;

				// disable pointer events until visible
				pointer-events: none;

				// when enabled fade & and block pointer events
				&.enabled {
					opacity: 1;
					pointer-events: initial;
					// cursor: not-allowed;
				}// &.enabled
				
			}// .focusCurtain

			// the layer that shows an arrow graphic when merging via the blender-like merge handles
			.mergeOverlay {

				// fill entire container, always on top
				// fill container on top
				position: absolute;
				inset: 0px 0px 0px 0px;
				z-index: 99;

				// transparent dark back
				// background: rgba(0, 0, 0, 0.4);

				// for animating in/out
				opacity: 0;
				transition: opacity 200ms ease-in-out;

				// disable pointer events until visible
				pointer-events: none;

				// when enabled fade & and block pointer events
				&.enabled {
					opacity: 1;
					pointer-events: initial;
				}// &.enabled

				// common styles for the two sub elements of the layer: the arrow image and the dark translucent png
				.arrowGraphic, .darkenGraphic {
					position: absolute;
					background-size: 100% 100%;
					background-repeat: no-repeat;
				}

				// this background never changes
				.darkenGraphic {
					background-image: url('../assets/img/window_merge_arrows/window_pane_merge_bg_fill.png');
				}

				// common styles for the arrow graphic and darkened area when either left or right
				&.left, &.right {
					.arrowGraphic, .darkenGraphic {
						top: 0px;
						height: 100%;
						width: 50%;
					}
				}// &.left, &.right

				// common styles for the arrow graphic and darkened area when either up or down
				&.up, &.down {
					.arrowGraphic, .darkenGraphic {
						left: 0px;
						height: 50%;
						width: 100%;
					}
				}// &.up, &.down


				// specifically just left styles
				&.left {
					.arrowGraphic {
						right: 0px;
						background-image: url('../assets/img/window_merge_arrows/window_pane_merge_arrow_r.png');
					}
					.darkenGraphic {
						left: 0px;
					}
				}// &.left

				// specifically just right styles
				&.right {
					.arrowGraphic {
						left: 0px;
						background-image: url('../assets/img/window_merge_arrows/window_pane_merge_arrow_l.png');
					}
					.darkenGraphic {
						right: 0px;
					}
				}// &.right

				// specifically up styles
				&.up {
					.arrowGraphic {
						bottom: 0px;
						background-image: url('../assets/img/window_merge_arrows/window_pane_merge_arrow_b.png');
					}
					.darkenGraphic {
						top: 0px;
					}
				}// &.up

				// specifically down styles
				&.down {
					.arrowGraphic {
						top: 0px;
						background-image: url('../assets/img/window_merge_arrows/window_pane_merge_arrow_t.png');
					}
					.darkenGraphic {
						bottom: 0px;
					}
				}// &.down


			}// .mergeOverlay

			// layer that appears on top of a frame when it's being split
			.splitLayer {

				// fill container on top
				position: absolute;
				inset: 0px 0px 0px 0px;
				z-index: 99;

				outline: none;

				// the line that will be used to show where the split will happen
				.splitCursorRedLine {

					position: absolute;
					inset: 0px 0px 0px 0px;
					background: red;

					&.horizontal {
						height: 2px;
					}

					&.vertical {
						width: 2px;
					}

				}// splitCursorRedLine

			}// .splitLayer

			// area to compute drop targets
			.tabDropTargets {

				position: absolute;
				inset: 25px 0px 0px 0px;
				z-index: 200;
				

				.dropTarget {
					position: absolute;

					&.center {
						// background: black;
						inset: 0px 0px 0px 0px;

					}// &.center

					&.splitLeft {
						inset: 0px auto 0px 0px;
						width: 15%;
						max-width: 80px;
						
						// background: rgba(255, 0, 0, 1);
					}// &.splitLeft

					&.splitRight {
						inset: 0px 0px 0px auto;
						width: 15%;
						max-width: 80px;
						
						// background: rgba(0, 0, 255, 1);

					}// &.splitRight

					&.splitTop {
						inset: 0px 0px auto 0px;
						height: 25%;
						max-height: 80px;

						// background: rgba(0, 255, 0, 0.2);

					}// &.splitTop

					&.splitBottom {
						inset: auto 0px 0px 0px;
						height: 25%;
						max-height: 80px;

						// background: rgba(255, 255, 0, 0.2);

					}// &.splitBottom

				}// .dropTarget
				
			}// .tabDropTargets

		}// .innerWrapper
		
		// the thin strips along the borders of the frame that we can use to resize frames
		.grabHandle {

			// fixed positioning within the window
			position: absolute;

			user-select: none;
			
			// styles for the horizontal edges
			&.horizontal {
				
				// fixed height
				height: 2px;

				// always snapped left/right aka full width
				left: 0px;
				right: 0px;
				width: 100%;

				// appear vertically draggable
				cursor: ns-resize;
			}

			// styles for the vertical edges
			&.vertical {

				// fixed width
				width: 2px;

				// always snapped top/bottom aka full height
				top: 0px;
				bottom: 0px;
				height: 100%;

				// appear horizontally draggable
				cursor: ew-resize;
			}

			// specific edges
			&.top { top: -2px; }
			&.bottom { bottom: -2px; }
			&.left { left: -2px; }
			&.right { right: -2px; } 

			// specific edge settings
			&.undetermined_edge { 
				pointer-events: none;
			}
			&.extremity_edge {
				// pointer-events: none;
				cursor: default;
				opacity: 0 !important;
			}
			&.partial_edge { 
				opacity: 0 !important;
			}
			&.adjacent_edge { 
				opacity: 0 !important;
			}
			
		}// .grabHandle 


		// one of the Blender-like merge handles in the top-right & bottom-left corners
		.mergeHandle {

			// fixed positioning in our window frame
			position: absolute;

			// always use this background image:
			background-image: url('../assets/img/window_frame_corners.png');
			background-repeat: no-repeat;
			// background-color: red;
			z-index: 99;

			// always this size box
			width: 12px;
			height: 12px;

			// look draggable
			cursor: move;

			// no
			user-select: none;

			// barely visible till hovered
			opacity: 0.3;
			&:hover { opacity: 1; }

			// for debug
			// border: 1px solid red;

			// styles for specific corners:
			&.TL {
				top: 0px;
				left: 0px;
				background-position: 0px 0px;
				border-radius: 30px 0px 100px 0px;
			}// &.TL
			&.TR {
				top: 0px;
				right: 0px;
				background-position: -13px 0px;
				border-radius: 0px 30px 0px 100px;
			}// &.TR
			&.BL {
				bottom: 0px;
				left: 0px;
				background-position: 0px -13px;
				border-radius: 0px 100px 0px 30px;
			}// &.BL
			&.BR {
				bottom: 0px;
				right: 0px;		
				background-position: -14px -14px;
				border-radius: 100px 0px 30px 0px;
			}// &.BR

		}// .mergeHandle

		// for debug
		&.debug {
			
			// debug grab-handle colors
			.grabHandle {

				// toggle opacity when hovered, during debug-time
				opacity: 0.5;
				&:hover {
					opacity: 1;
				}

				// specific debug colors
				&.undetermined_edge { background: magenta }
				&.extremity_edge { background: red; }
				&.partial_edge { background:  rgb(12, 186, 186); }
				&.adjacent_edge { background: yellowgreen; }
				&.selected_edge { background: greenyellow; opacity: 0; }

			}// .grabHandle

		
		}// &.debug

		// styles for MWI frames (that don't have a header	)
		&.noHeader {

			// in wrapper, already 0,0,0,0
			.innerWrapper {

				// move the drop targets to fill full frame
				.tabDropTargets {

					// 0 on all edges
					inset: 0px 0px 0px 0px;

				}// .tabDropTargets

			}// innerWrapper

		}// &.noHeader

	}// .windowFrame

</style>
