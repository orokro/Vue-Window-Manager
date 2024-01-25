<!--
	WindowingSystem.vue
	-------------------

	This file will be the top-level component in the app, that handles all the various Windows
	that can spawn in, be moved around, etc.

	Nothing in the app should exist outside this component, except maybe a full screen modal
	if one is implemented later.

	The actual data for the window's will be stored in the useWindowManagement hook.

	See the comment block in useWindowManagement.js for more details on how the system
	is built.

-->
<template>

	<!-- this will be the outermost wrapper that is fixed to screen width/height, 
		because all windows must be children. -->
	<div ref="containerRef" class="windowFrameContainer">

		<!-- debug message, if applicable -->
		<div v-if="false && useWindowingDebug==true" class="debugPanel t r">
			Windows go here.<br>
			Size is: width: {{ windowContainerSize.width }}, height: {{ windowContainerSize.height }}
		</div>

		<!-- loop to spawn our WindowFrames -->
		<WindowFrameV
			v-for="(frame, idx) in windowMgr.framesRef.value"
			:frameID="frame.frameID"
			:frame="frame"
			:key="frame.frameID"
			:idx="idx"
			@onWindowTearOff="handleWindowTearOff"
		/>
	</div>

	<!-- spawn all the windows in this holding pen until their teleported to their frames or whatnnot -->
	<WindowPen/>

	<!-- the full screen layer we'll teleport windows to when they're being dragged -->
	<WindowDragLayer/>

</template>
<script setup>

// vue
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';

// components
import WindowFrameV from './WindowFrameV.vue';
import WindowPen from './WindowPen.vue';
import WindowDragLayer from './WindowDragLayer.vue';

// hooks
import useWindowManagement from '../hooks/useWindowManagement';
import { useWindowingDebug } from '../hooks/useFlags';

// invoke hooks
const { windowMgr } = useWindowManagement();

// DOM refs
const containerRef = ref(null);


// our calculated DOM size, updated automatically when our component resizes
const windowContainerSize = shallowRef({width: 0, height: 0});

window.cr = containerRef;


// function to update our window size based on our DOM measurements
function updateWindowContainerSize(){

	// get new width & height of our container element
	const containerWidth = containerRef.value.offsetWidth;
	const containerHeight = containerRef.value.offsetHeight;

	// save our new sizes
	windowContainerSize.value = {
		width: containerWidth,
		height: containerHeight
	};

	// tell window manager about our new size
	windowMgr.onContainerResize(containerWidth, containerHeight);
}

// make a resize observer to update our sizes when window size changes
const resizeObserver = new ResizeObserver(updateWindowContainerSize);


// init upon mount
onMounted(()=>{

	// attach the resize observer
	resizeObserver.observe(containerRef.value);

	// tell our windowing system about our window container DOM
	windowMgr.setContainerEl(containerRef.value);
});


// disable our resize observer if the component is ever unmounted for any reason
// (NOTE: this component is so high-level, it doesn't really make sense to ever unmount it, but good housekeeping)
onUnmounted(()=>{

	// stop observing resize
	resizeObserver.disconnect();

	// tell our windowing system that it's DOM element is about to be destroyed
	windowMgr.unsetContainerEl();
});


/**
 * Handle when a window is being torn
 * 
 * @param {Object} tearData - data about the window being torn
 */
function handleWindowTearOff(tearData){

	// tell window manager to tear off this window
	const { window, frame, titleBar } = tearData;
	windowMgr.windowDragSystem.tearWindow(window, frame, titleBar);
}

</script>
<style lang="scss">

	// pull in our global reusable styles & variables
	@import '../css/main.scss';


	// the main container for all the spawned windows
	.windowFrameContainer {

		// force box sizing
		box-sizing: border-box;

		// fixed size under the top/bottom bar
		position: fixed;
		inset: 38px 1px 28px 1px;

		// thicc borders
		border-top: 2px solid black;
		border-bottom: 2px solid black;

		// no scroll
		overflow: clip;

		// the void
		// background: red;

	}// .windowFrameContainer

	// the layer that fills the screen for 

</style>
