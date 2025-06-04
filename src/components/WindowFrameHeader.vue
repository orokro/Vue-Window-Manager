<!--
	WindowFrameHeader.vue
	---------------------

	Builds the header area of a WindowFrameV.vue component.

	Basically, if it's a Tabbed WindowFrame we'll render and manage the tabs here.

	If it's a Single view, we'll show just the single header, etc.
-->
<template>
	<div 
		v-if="frame.frameStyle.value!=WindowFrame.STYLE.MWI"
		class="frameHeader noSel"
		:class="{
			tabbed: frame.frameStyle.value==WindowFrame.STYLE.TABBED
		}"
	>	
	
		<!-- if we're in single mode, just show the title -->
		<div 
			v-show="frame.frameStyle.value==WindowFrame.STYLE.SINGLE"
			class="singleTitle dropTarget"
			:frameID="frame.frameID"
			region="frame"
			:class="{
				isDragging: draggingSingleTitleBar
			}"
			@mousedown="e=>startSingleDrag(e, tabsRef[0])"
		>
			{{ tabsRef[0]?.title }}
		</div>

		<!-- render tabs if we're in tabbed mode -->
		<div 
			v-show="frame.frameStyle.value==WindowFrame.STYLE.TABBED"
			ref="tabContainerEl"
			class="tabContainer dropTarget"
			:class="{
				dropMode: props.frame.mgr.windowDragSystem.isDragging.value==true
			}"
			:frameID="frame.frameID"
			region="tab"
			:fantomTabX="9000"
			@wheel.passive="scrollHack"
		>
			
			<!-- loop to generate our tabs -->
			<div 
				v-for="(tab, idx) in tabsRef"
				class="tab"
				:frameID="frame.frameID"
				region="tab"
				:fantomTabX="tab.x"
				:class="{ 
					dropTarget: tab.fantom==false,
					selected: tab.id==frame.currentTab.value,
					dragging: tab.id==dragTab,
					fantom: tab.fantom==true
				}"
				:key="idx"
				:idx="idx"
				:style="{
					left: `${tab.x}px`,
					width: `${tab.width}px`,
				}"
				@mousedown="e=>selectTabAndStartDrag(e, tab)"
			>
				<div class="title">
					{{tab.title}}
				</div>
				<div class="closeButton" @mousedown="closeTab(tab)">
					<span>✖</span>
				</div>
			</div>

			<!-- block at the end of the tabs to add some early scroll trigger -->
			<div 
				class="spacer"
				:style="{
					left: `${spacerPos}px`,
				}"
			/>
			
		</div>

		<!-- gradient overlays on the left/right so tabs fade out when scrolled -->
		<div v-if="frame.frameStyle.value==WindowFrame.STYLE.TABBED" class="gradientFade left"></div>
		<div v-if="frame.frameStyle.value==WindowFrame.STYLE.TABBED" class="gradientFade right"></div>

	</div>
</template>
<script setup>

// vue
import { onMounted, ref, shallowRef, watch } from 'vue';

// lib/misc
import { arrayDiff } from 'garraydiff';
import WindowFrame from '@classes/WindowFrame';
import Window from '@classes/Window';

// hooks
import useDragHelper from '@hooks/useDragHelper';
import { getTextWidth, getCanvasFont } from '@hooks/useTextMeasuring';

// invoke hooks
const { dragHelper } = useDragHelper();

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

// reference to our tab container element
const tabContainerEl = ref(null);

// tab that is potentially being drag
const dragTab = ref(null);

// true when dragging the single frame title bar
const draggingSingleTitleBar = ref(false);

// the position of spacer to the right of tabs to force scroll trigger
const spacerPos = ref(0);

// for debug, show tab count
const count = ref(0);

// store our tabs here, each tab will be an object about the window it represents and it's position
// in the list of tabs
let tabs = [];
const tabsRef = shallowRef([]);

// ref to drag helper callbacks id for cancellation
let dragHelperCBRefID = null;

// save reference to the element being dragged when a tab or single view is dragged
// so when we do a tear-off we can measure the element
// we'll keep this null otherwise when not in use
let dragTitleBarRef = null;

// update tabs initially once when we mount always
onMounted(()=>{
	updateTabs(props.frame.windows);
});

// when our window frames list of windows changes, we need to update our tabs list.
watch(
	()=>props.frame.windowsRef.value,
	()=>{
		updateTabs(props.frame.windows);
	}
);

// when our window style changes, we need to update our tabs list.
watch(
	()=>props.frame.frameStyle.value,
	()=>{
		updateTabs(props.frame.windows);
	}
);


/*
	Handle when the scene enters window/tab drag-n-drop mode,
	so we can save what our tab was when the mode was entered
*/
const tabUponDragModeEntered = ref(null);
watch(
	()=>props.frame.mgr.windowDragSystem.isDragging.value,
	()=>{

		const isDragging = props.frame.mgr.windowDragSystem.isDragging.value;

		// save our current tab
		if(isDragging){
			tabUponDragModeEntered.value = props.frame.currentTab.value;
		}else{

			const fantomTab = tabs.filter(t=>t.fantom==true)[0];
			if(fantomTab!==undefined){
				fantomTab.fantom = false;
				props.frame.currentTab.value = fantomTab.id;
				return;
			}
			// reset old tab UNLESS we had tab dropped
			if(tabUponDragModeEntered.value!=null){
				props.frame.currentTab.value = tabUponDragModeEntered.value;
			}
		}
	}
);

/*
	handle when a user tries to drop a tab on our tap strip

	note: we monitor the tabLeft value because we really care about mouse events
	and just monitoring the frame wont update when the mouse moves.

	So instead, we'll monitor all tab left changes, and only update if
	our frame ID matches also.
*/ 
watch(
	()=>props.frame.mgr.windowDragSystem.dropRegion.tabLeft.value,
	()=>{
		updateFantomTab();
	}
);


/**
 * When in window-drag-n-drop mode, this will update our fantom tab settings
 */
function updateFantomTab(){

	// if it's not us, remove any fantom tabs, if any
	let targetFrame = props.frame.mgr.windowDragSystem.dropRegion.tabFrame.value;
	if(targetFrame!=props.frame.frameID){

		updateTabs(props.frame.windows);

		if(tabUponDragModeEntered.value!=null)
			props.frame.currentTab.value = tabUponDragModeEntered.value;

		// gtfo
		return;
	}

	// see if we already have a fantom tab:
	let ft = tabs.filter(t => t.fantom==true)[0];

	// if we don't have one, make one now
	if(ft==null || ft===undefined){

		ft = makeTabData(props.frame.mgr.windowDragSystem.dragOperationDetails.window, true)
	}

	// set x position
	ft.x = props.frame.mgr.windowDragSystem.dropRegion.tabLeft.value - ft.width/2;

	// let's make new list of tabs
	let newSortedTabs = [...tabs, ft];

	// sort tabs by x
	newSortedTabs.sort((tabA, tabB)=> tabA.x - tabB.x);

	// reassign order by new sort:
	for(let i=0; i<newSortedTabs.length; i++)
		newSortedTabs[i].order = i;

	// do regular update of our tabs
	updateTabs(props.frame.windows, ft);

	// select non-existed tab so it grays out
	props.frame.currentTab.value = 9999;
}


/**
 * We want the mousewheel to scroll our tabs horizontally if they're overflowing
 * 
 * @param {Event} e - JS Event object
 */
function scrollHack(e){

	// e.preventDefault();
	tabContainerEl.value.scrollBy({
		left: e.deltaY < 0 ? -30 : 30,
	});
}


/**
 * When in SINGLE mode, we should still be able to drag the titlebar to tear
 * 
 * @param {Event} e - JS Event Object
 * @param {Object} tab - one of our tab data objects, as created by makeTabData(...)
 */
function startSingleDrag(e, tab){

	// if we don't have a frame, just gtfo
	if(props.frame.windows.length<=0)
		return;
	
	// start a drag helper
	// we'll say the cursor has to go 15 pixels up or down to "tear off" the tab.
	const tearThreshold = 10;

	// save the reference to the title bar being dragged
	dragTitleBarRef = e.target;

	// for affecting CSS during the drag:
	draggingSingleTitleBar.value = true;

	// start monitoring mouse position for dragging the tab
	dragHelperCBRefID = dragHelper.dragStart(
		
		// during drag operation
		(dx, dy) => { 

			// if either direction went past our threshold
			if(Math.abs(dx)>tearThreshold || Math.abs(dy)>tearThreshold){
				startWindowTear(tab);
				draggingSingleTitleBar.value = false;
				return;
			}
		},

		// upon completion of drag operation
		(dx, dy) => {
			draggingSingleTitleBar.value = false;
			dragTitleBarRef = null;
		}
	);
}


/**
 * Selects a tab when clicked
 * 
 * @param {Event} e - JS Event object
 * @param {Object} tab - one of our tab data objects, as created by makeTabData(...)
 */
function selectTabAndStartDrag(e, tab){

	// switch id
	props.frame.currentTab.value = tab.id;
	tabUponDragModeEntered.value = tab.id;

	// we'll say the cursor has to go 15 pixels up or down to "tear off" the tab.
	const tearThreshold = 30;

	// save tabs initial x position
	const initialDragX = tab.x;

	// so we can turn on CSS and what not in template
	dragTab.value = tab.id;

	// save the reference to the title bar being dragged
	dragTitleBarRef = e.target;

	// start monitoring mouse position for dragging the tab
	dragHelperCBRefID = dragHelper.dragStart(
		
		// during drag operation
		(dx, dy) => { 

			// if we moved enough to 'tear' off the tab, let's start the tear
			// mode & gtfo
			if(Math.abs(dy) > tearThreshold){
				startWindowTear(tab);
				return;
			}

			// compute new position for this tab...
			const newTabX = initialDragX - dx;
			tab.x = newTabX;

			// let's make new list of tabs
			let newSortedTabs = [...tabs];

			// sort tabs by x
			newSortedTabs.sort((tabA, tabB)=> tabA.x - tabB.x);

			// reassign order by new sort:
			for(let i=0; i<newSortedTabs.length; i++)
				newSortedTabs[i].order = i;

			// do regular update of our tabs
			updateTabs(props.frame.windows);

			// make sure to keep our goofy x
			tab.x = newTabX;
		},

		// upon completion of drag operation
		(dx, dy) => {

			// do regular update of our tabs
			updateTabs(props.frame.windows);

			// clear drag tab & drag related variables
			dragTab.value = null;
			dragTitleBarRef = null;
		}
	);
}


/**
 * 
 * @param {Object} tab - one of our tab data objects, as created by makeTabData(...)
 */
function startWindowTear(tab){

	// get window
	const win = props.frame.windows.filter(win => win.windowID==tab.id)[0];

	// start a new drag helper with empty callbacks to cancel out the old log
	if(dragHelperCBRefID!=null){
		dragHelper.cancelCallback(dragHelperCBRefID);
		dragHelperCBRefID = null;
	}

	// raise event
	emits('onWindowTearOff', {
		window: win,
		frame: props.frame,
		titleBar: dragTitleBarRef
	});
}


/**
 * Closes one of our tabs (i.e. removes window from the frame)
 * @param {Object} tab - one of our tab data objects, as created by makeTabData(...)
 */
function closeTab(tab){

	// just use our frame's remove window method with the tab's id string
	props.frame.removeWindow(tab.id);
}


/**
 * Makes an object with info we'll use to display for tabs
 * 
 * @param {Window} window - a window to make tab data for
 * @param {Boolean} fantom - OPTIONAL; creates fantom tab data for when dropping a window
 * @returns {Object} like {id, window, title, width, x}
 */
function makeTabData(window, fantom){

	// handle optional parameter
	fantom = (fantom===undefined) ? false : fantom;

	// get font settings for our tab container
	const tabContainerFontString = tabContainerEl.value==null ? '' : getCanvasFont(tabContainerEl.value);

	// compute the width of the text string:
	const titleTextWidth = getTextWidth(window.title, tabContainerFontString);

	// well give some room for the icon, and later on, use some other scaling logic here
	const tabWidth = titleTextWidth*1.1 + 30;
	
	// return an object with "tab data" that this component will use to display tabs
	return {
		id: window.windowID,
		title: window.title,
		width: tabWidth,
		order: 9999,
		x: 0,
		fantom: fantom
	};
}


/**
 * Removes deleted windows, mixes in new windows & updates our tabs we should render
 * 
 * @param {Array<Window>} windows - array of Windows in our WindowFrame
 * @param {Object} fantomTab - OPTIONAL; fantom tab data to include if we're dragging & dropping
 */
function updateTabs(windows, fantomTab){
	
	// for debug
	count.value = props.frame.windows.length;	

	// if our current window style is "single" we should remove all tabs besides the
	// currently selected one
	if(props.frame.frameStyle.value == WindowFrame.STYLE.SINGLE){
		if(props.frame.windows.length > 1){

			const windowsToRemove = props.frame.windows.filter(win => win.windowID != props.frame.currentTab.value);
			windowsToRemove.map(win => props.frame.removeWindow(win));	
		}
	}

	// make tab data for all windows, and we'll do a DIFF after we have the current status
	const newTabData = windows.map(window => makeTabData(window));

	// if we have fantom tab data
	if(fantomTab!==undefined){
		newTabData.push(fantomTab)
	}

	// we'll build a new array of tabs, mixing in the old and hte new
	let newTabsList = [...tabs];

	// compare to our existing tabs array
	const tabDiff = arrayDiff(tabs, newTabData, 'id', 'id');

	// if we removed any tabs, filter our their old data
	if(tabDiff.removedItems.length>0){
		tabDiff.removedItems.map(removedItem =>{
			newTabsList = newTabsList.filter(tab => tab.id != removedItem.id);
		});
	}

	// mix in the new items
	newTabsList = [...newTabsList, ...tabDiff.newItems];

	// the new items will have a default sort order of 9999, so let's sort them to the right
	// note that sort mutates array in place
	newTabsList.sort((tabA, tabB)=>tabA.order-tabB.order);

	// now we can loop over the array and re-assign sort numbers based on their current index
	// NOTE: because we mixed the old tabs in with the new, old tabs will retain their old sort-order already,
	// because the sort used the existing order
	// FURTHERMORE: whilst we're here, we can also compute the new x-positions of the tabs, factoring in their width
	let x = 6;
	for(let i=0; i<newTabsList.length; i++){

		// get the tab info
		const tabData = newTabsList[i];

		// reassign it's order ID
		tabData.order = 0;
		tabData.x = x;
		
		// increment x by our width plus some padding for next iteration
		x += (tabData.width + 3);

	}// next i

	// save new spacer pos
	spacerPos.value = x;

	// update our static/dynamic arrays
	tabs = newTabsList;
	tabsRef.value = [...tabs];

	// if we don't yet have a selected tab, select the first tab
	if(props.frame.currentTab.value==null){

		props.frame.currentTab.value = (tabs.length<=0) ? null : tabs[0].id;
	
	// other wise, if we had a tab value & its no longer in the list, we should update it
	}else{

		if(newTabsList.filter(tab => tab.id==props.frame.currentTab.value).length <= 0){
			props.frame.currentTab.value = (tabs.length<=0) ? null : tabs[0].id;
		}

		// if we added a tab, select whatever the last tab is
		if(tabDiff.newItems.length>0 && tabs.length>0){
			props.frame.currentTab.value = tabs[tabs.length-1].id;
		}
	}	
}

</script>
<style lang="scss" scoped>

	/*
		The header that contains either:
			- The single window title bar
			- The row of tabs, if tabbed frame
			- Or hidden, if MWI frame.
		
		Regardless if hidden or not, the Hamburger menu will always be present
	*/
	.frameHeader{

		// fixed along the top
		position: absolute;
		inset: 0px 0px auto 0px;
		height: 25px;
		border-radius: 6px 6px 0px 0px;

		// allow NO ESCAPEES
		overflow: clip;

		// just darken a bit
		// background: rgba(0, 0, 0, 0.2);
		background: #5C5C60;

		// darker bg when tabbed because tabs will be lighter
		&.tabbed {
			// background: rgba(0, 0, 0, 0.6);
			background: #2E2E30;
		}

		// the title that appears when a frame is switch to "single" mode
		.singleTitle {

			// fill area except under hamburger menu
			position: absolute;
			inset: 0px 20px 0px 0px;

			// smaller font size for tabs
			font-size: 14px;
			letter-spacing: 0.8px;
			color: rgb(209, 209, 209);
			text-align: center;

			// some padding for the text on top
			padding-top: 4px;

			&.isDragging {
				cursor: move;
			}// &.isDragging

		}// .singleTitle

		// container for spawned tabs
		.tabContainer {

			// don't allow text selection
			user-select: none;

			// fill the entire header, except for where the hamburger menu is
			position: absolute;
			inset: 0px 0px 0px 0px;

			// smaller font size for tabs
			font-size: 14px;
			letter-spacing: 0.8px;

			// for debug
			// border: 1px solid red;

			// allow nothing to escape
			overflow-y: clip;
			overflow-x: auto;
			
			
			&::-webkit-scrollbar {
				display: none;
			}

			// disable tab point events when in window-drag & drop mode
			&.dropMode {

				.tab {
					pointer-events: none;
				}// .tab

			}// &.dropMode

			// style for tabs themselves
			.tab {

				// fix position
				position: absolute;
				top: 3px;
				bottom: 0px;

				// default z-order for non-selected tab
				z-index: 0;

				transition: left 0.3s ease-in-out;

				// nice rounded tabs
				border-radius: 6px 6px 0px 0px;

				// darker bg and text unless selected
				background: #4a4a4e;
				color: rgb(150, 149, 149);
							
				// light up on hover
				&:hover {
					// background: #707074;
					color: rgb(209, 209, 209);
				}// &:hover
				
				// when we're the selected tab
				&.selected {
					background: #737378;
					color: rgb(209, 209, 209);

					// always on top
					z-index: 99;			

				}// &.selected	
				
				// fantom tabs are hidden
				&.fantom {

					border-left: 2px dashed white;
					border-top: 2px dashed white;
					border-right: 2px dashed white;
					
					.title {
						opacity: 0;
					}

					.closeButton {
						display: none;
					}
				}

				// true whilst tab is begging dragged horizontally
				&.dragging {
					cursor: move;
					transition: left 0.0s ease-in-out;
				}

				// position the title text & font color
				.title {

					// don't interfere with dragging
					pointer-events: none;

					// fixed pos
					position: absolute;
					top: 3px;
					left: 8px;

					
				}// .title

				// the close button
				.closeButton {

					// fixed in the space on the right
					position: absolute;
					top: 4px;
					right: 4px;

					// text setting
					font-size: 12px;
					color: rgba(0, 0, 0, 0.5);

					border-radius: 100px;
					width: 14px;
					height: 14px;

					// the actual X lives in a span:
					span {
						position: relative;
						left: 2px;
						top: -1px;
					}// span

					// hover styles
					&:hover {

						background: rgba(255, 0, 0, 0.3);
						color: white;

					}//&:hover

				}// close button

			}// .tab

			// space we'll use to force scroll earlier
			.spacer {
				
				// fixed pos, the "left" will be set in template
				position: absolute;
				top: 0px;
				bottom: 0px;
				width: 20px;

				// for debug
				// background: yellowgreen;

			}// .spacer

		}// .tabContainer

		// gradients above the tabs so we can fade them out when needing to scroll
		.gradientFade{

			// fixed positioning in header tabs
			position: absolute;
			z-index: 99;
			pointer-events: none;
			inset: 0px 0px 0px 0px;

			// for debug
			background: red;

			// specific styles for left/right
			&.left {
				right: auto;
				width: 6px;
				background: linear-gradient(90deg, rgba(46,46,48,1) 15%, rgba(46,46,48,0) 100%);
			}

			&.right {
				left: auto;
				width: 25px;
				background: linear-gradient(-90deg, rgba(46,46,48,1) 70%, rgba(46,46,48,0) 100%);
			}
		}// .gradientFade

	}// .frameHeader

</style>
