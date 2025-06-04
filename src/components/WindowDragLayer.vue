<!--
	WindowDragLayer.vue
	-------------------

	When a tab is dragged off the tab set, the window will popup on our drag layer
	so the user can move it to another tab group or frame split or whatever.

	Same for when a WMI window is dragged out of it's frame, or when a single frame
	is dragged far enough.

	Basically, this component provides a layer to teleport windows to
	as they're dragged around.

	This will also provide the logic for doing the drag-n-drop routine.
-->
<template>

	<!-- the layer that will be full screen and hold the window that's being moved -->
	<div 
		v-if="windowMgr.windowDragSystem.isDragging.value==true"
		class="windowDragLayer"
		:class="{animations: animationsEnabled==true}"
	>
		
		<!-- a dashed box to show the region we're gonna drop into -->
		<div 
			class="targetRegion"
			:class="{
				isMWI: windowMgr.windowDragSystem.dropRegion.isMWI.value == true
			}"
			:style="{
				left: `${windowMgr.windowDragSystem.dropRegion.x.value}px`,
				top: `${windowMgr.windowDragSystem.dropRegion.y.value}px`,
				width: `${windowMgr.windowDragSystem.dropRegion.width.value}px`,
				height: `${windowMgr.windowDragSystem.dropRegion.height.value}px`,
			}"
		>
		</div>

		<!-- the thing that actually moves around whilst window is being dragged 
			Note that this windowDragContainer is also the same size as the entire layer.

			The titlebar and window thumbnail container will be children of this, fixed
			position as child elements. This is so they can be animated easier with transitions
		-->
		<div 
			class="windowDragContainer"
			:style="{
				left: `${windowMgr.windowDragSystem.dragPos.x.value - layerOffsetX}px`,
				top: `${windowMgr.windowDragSystem.dragPos.y.value - layerOffsetY}px`,
			}"
		>

			<!-- title bar is fixed position withing the drag container layer-->
			<div
				ref="dragTitleEl"
				class="dragTitle"
				:style="{
					left: `${titleBarX}px`,
					top: `${titleBarY}px`,
					width: `${titleBarWidth}px`,
				}"
			>
				{{ title }}
			</div>

			<!-- the area where we'll mount the window whilst we drag -->
			<div
				ref="windowThumbEl"
				class="windowThumb"
				:style="{
					left: `${windowX}px`,
					top: `${windowY}px`,
					width: `${windowContainerWidth}px`,
					height: `${windowContainerHeight}px`,
					transform: `scale(${windowScale})`,
					// border: `${2 * (1/windowScale)}px solid black`,
					'border-radius': `${7 * (1/windowScale)}px`,
					// overflow: 'clip',
				}"
			>
			</div>
			
		</div>

	</div>
	
</template>
<script setup>

// vue
import { nextTick, ref, watch } from 'vue';

// hooks
import useWindowManagement from '../hooks/useWindowManagement';
import { getTextWidth, getCanvasFont } from '../hooks/useTextMeasuring';

// invoke hooks
const { windowMgr } = useWindowManagement();

// the title of window being dragged at the moment
const title = ref('a');

// DOM element refs
const dragTitleEl = ref(null);
const windowThumbEl = ref(null);

// the width and height we'll use for the window container (not factoring in transform scales)
const windowContainerWidth = ref(0);
const windowContainerHeight= ref(0);
const windowX = ref(0);
const windowY = ref(0);
const windowScale = ref(1);

// true once we've enabled animations
const animationsEnabled = ref(false);

// the entire layer will move w/ the cursor, so we can animate thumbnail components easier
// i.e. drag will move a large full screen layer, not the thumbnail itself.
// the thumbnail will be absolutely positioned within the screen-size layer
let layerOffsetX = 0;
let layerOffsetY = 0;

// the title bar's x/y position and width
const titleBarX = ref(0);
const titleBarY = ref(0);
const titleBarWidth = ref(0);

// when we detect a drag operation started, we can set up our component and whatnot
watch(
	()=>windowMgr.windowDragSystem.isDragging.value,
	()=>{
		
		// if it's changed, and NOW it's true, start drag operation
		if(windowMgr.windowDragSystem.isDragging.value==true){

			setTimeout(()=>{
				windowMgr.windowDragSystem.dragTitleEl.value = dragTitleEl.value;
				startDrag();
			}, 0);
		}
	}
);

const waitABit = (fn)=>{
	setTimeout(fn, 100);
	// nextTick(()=>{
	// 	nextTick(()=>{
	// 		nextTick(fn)
	// 	})
	// })
};

/**
 * Sets up this component for dragging a window...
 */
async function startDrag(){

	// no animations by default
	animationsEnabled.value = false;

	// make sure animations disabled before we continue
	nextTick(()=>{

		// get the details of our drag operation
		const details = windowMgr.windowDragSystem.dragOperationDetails;

		// update our title
		title.value = details.window.title;
		
		const font = getCanvasFont(dragTitleEl.value);
		let titleBoxWidth = getTextWidth(details.window.title, font) * 1.1 + 16; 

		layerOffsetX = details.initialCursorPos.x;
		layerOffsetY = details.initialCursorPos.y;

		// if we're dragging a tab, we have a fixed offset
		if(details.isTab==true){

			titleBarX.value = details.initialHandleDIM.left;
			titleBarY.value = details.initialCursorPos.y - 10;
			titleBarWidth.value = titleBoxWidth;
			
		}else{
			// titleBarX.value = details.initialCursorPos.x - titleBoxWidth/2;
			titleBarY.value = details.initialCursorPos.y - 10;
			titleBarX.value = details.initialHandleDIM.left;
			titleBarWidth.value = details.initialHandleDIM.width;
		}

		// set initial window container size
		windowX.value = details.initialWindowDIM.left;
		windowY.value = titleBarY.value + 25;
		windowContainerWidth.value = details.initialWindowDIM.width;
		windowContainerHeight.value = details.initialWindowDIM.height;
		windowScale.value = 1;
		
		// parent window dom to this container!
		details.window.domContainer.value = windowThumbEl.value;

		// on next frame, we'll turn on animations..
		waitABit(()=>{

			// this will turn the animation class on..
			animationsEnabled.value = true;

			// wait to make sure animations are enabled
			nextTick(()=>{

				titleBarX.value = details.initialCursorPos.x - titleBoxWidth/2;
				titleBarWidth.value = titleBoxWidth;

				// move window to the left of the tab
				windowX.value = titleBarX.value - 8;


				// now we need to compute a new width/height for the window so the thumbnail doesn't look stupid
				// we also want compute the transform size so the window can shrink

				// first things first, we need to determine the minimum window size
				const defaultMinWidth = 100;
				const minTitleWidth = titleBoxWidth + 32;
				const minWinWidth = (minTitleWidth > defaultMinWidth) ? minTitleWidth : defaultMinWidth;

				// if the window's initial size is already too small, make it bigger
				let newWidth = details.initialWindowDIM.width;
				newWidth = (newWidth < minWinWidth) ? minWinWidth : newWidth;

				let newHeight = newWidth * 0.5625;

				// set our new window dimensions
				windowContainerWidth.value = newWidth;
				windowContainerHeight.value = newHeight;

				// now we need to figure out what scale to use for horizontally resizing the window
				// so our thumbnails are always minWidth after scaling..
				const scaleRatio = 1/(newWidth / minWinWidth);


				windowScale.value = scaleRatio;

			});
		});

	});
}

</script>
<style lang="scss" scoped>

	// the main full screen layer
	.windowDragLayer {

		// no pointer interference
		pointer-events: none;
		
		// fill screen
		position: absolute;
		inset: 0px 0px 0px 0px;
		z-index: 9001;

		// for debug
		// background: rgba(255, 0, 0, 0.1);

		// the dashed box to show off our drop-region
		.targetRegion {

			// fixed positioning
			position: absolute;

			border: 2px dashed white;
			border-radius: 8px;
		}// .targetRegion


		// the container for the thumbnail 
		.windowDragContainer {

			// so we can see whats under the window as we drag it
			opacity: 0.75;

			// fixed positioning within our drag-layer
			position: absolute;

			// fill main container
			width: 100%;
			height: 100%;

			// for debug
			// background: rgb(0, 255, 0, 0.1);

			// title bar for window thumbnail whilst being dragged
			.dragTitle {

				// fixed positioning within our drag-layer
				position: absolute;

				// fixed height
				height: 25px;

				background: #5C5C60;
				// background: #737378;
				
				cursor: move;

				overflow: clip;
				// smaller font size for tabs
				font-size: 14px;
				letter-spacing: 0.8px;
				color: rgb(209, 209, 209);
				text-align: center;

				// some padding for the text on top
				padding: 4px 8px;

				// rounded box corners on top left/right
				border-radius: 7px 7px 0px 0px;
				// border-left: 2px solid black;
				// border-top: 2px solid black;
				// border-right: 2px solid black;
				

			}// .dragTitle 

			// the container where we'll mount the window as a thumbnail
			.windowThumb {

				// border: 2px solid black;
				border-radius: 7px;

				// fixed positioning within our drag-layer
				position: absolute;
				overflow: clip;

				// scale from the top-left only
				transform-origin: top left;

			}// .windowThumb

		}// .windowDragContainer

		// styles for when animations are enabled
		&.animations {

			.targetRegion {

				transition: 
					left 0.2s ease-in-out,
					top 0.2s ease-in-out,
					width 0.2s ease-in-out,
					height 0.2s ease-in-out;

				&.isMWI {
					transition: 
					left 0.0s ease-in-out,
					top 0.0s ease-in-out,
					width 0.0s ease-in-out,
					height 0.0s ease-in-out;
				}
			}
			
			.windowDragContainer{

				// for debug
				// background: rgb(0, 0, 255, 0.1);
				
				.dragTitle {

					transition: 
						width 0.2s ease-in-out,
						left 0.2s ease-in-out;
				}// .dragTitle

				.windowThumb {

					transition: 
						width 0.2s ease-in-out,
						height 0.2s ease-in-out,
						left 0.2s ease-in-out,
						transform 0.2s linear;

				}// .windowThumb

			}// .windowDragContainer

		}// &.animations

	}// .windowDragLayer

</style>
