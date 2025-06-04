<!--
	WindowManager.vue
	-----------------

	This is the main component to export & for uses of the library to consume.

	In other words, this will be the entry point for using the Window Manager.

	Withing this component, we will instantiate an instance of WindowManager.js,
	which is the vanilla JavaScript class that manages all the windows, frames, etc.

	We will use provide/inject to make the WindowManager instance available to
	all our downstream components, so they can access it and use it.
-->
<template>

	<div 
		ref="containerRef"
		class="windowManager"
	>
		<!-- The top bar with menus and controls that cannot be replaced. -->
		<TopBar v-if="showTopBar">
			<slot name="topBar">
				<component v-if="topBarComponent!=null" :is="topBarComponent" />
			</slot>
		</TopBar>

		<!-- The component that manages all spawned windows / window divisions, etc -->
		<WindowingSystem />

		<!-- The status bar that shows info and instructions, app-wide. -->
		<StatusBar v-if="showStatusBar">
			<slot name="statusBar">
				<component v-if="statusBarComponent!=null" :is="statusBarComponent" />
			</slot>
		</StatusBar>

		<!-- Library of SVG Symbols we'll load in, that our ContextMenu system uses -->
		<MenuIconSVGs/>

		<!-- when we're dragging something (like windows) they will teleport to this layer -->
		<div ref="dragHoverLayerRef" class="dragHoverLayer"></div>

	</div>

</template>
<script setup>

// vue
import { ref, provide, computed } from 'vue';

// components
import TopBar from './TopBar.vue';
import WindowingSystem from './WindowingSystem.vue';
import StatusBar from './StatusBar.vue';
import MenuIconSVGs from './MenuIconSVGs.vue';

// classes
import WindowManager from '@classes/WindowManager';

// set up some props
const props = defineProps({

	// if we want to use the debug mode, which will show some extra info
	useWindowingDebug: {
		type: Boolean,
		default: false
	},

	// true if we should show the top bar
	showTopBar: {
		type: Boolean,
		default: true
	},

	// true if we should show the status bar
	showStatusBar: {
		type: Boolean,
		default: true
	},

	// component to use for the top bar if any
	// NOTE: they can also use slots for this
	topBarComponent: {
		type: Object,
		default: null
	},

	// component to use for the status bar if any
	// NOTE: they can also use slots for this
	statusBarComponent: {
		type: Object,
		default: null
	}

});

// get HTML DOM ref to the main container for this component, so we can compute
// x/y position for offsetting mouse coordinates
const containerRef = ref(null);

// make a new window manager if one doesn't exist yet
const windowMgr = new WindowManager(props.useWindowingDebug);

// provide the window manager for all our components down stream
provide('windowManager', windowMgr);

// dom refs
const dragHoverLayerRef = ref(null);

</script>
<style lang="scss">

	// main component!
	.windowManager {

		// fill parent container always
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0px 0px 0px 0px;

		// fill the entire screen
		.dragHoverLayer {
			
			// fill screen, always on top
			position: absolute;
			inset: 0px 0px 0px 0px;
			z-index: 9001;

			// no pointer events on this bad boy
			pointer-events: none;

			// for debug
			/* // background: rgba(255, 0, 0, 0.2); */

			> div {
				box-sizing: border-box;
			}

		}// .dragHoverLayer

	}// .windowManager

</style>
