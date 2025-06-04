<!--
	WindowManager.vue
	-----------------

	This is the main component to export & for uses of the library to consume.

	In other words, this will be the entry point for using the Window Manager.
-->
<template>

	<div class="windowManager">

		<!-- The top bar with menus and controls that cannot be replaced. -->
		<TopBar></TopBar>

		<!-- The component that manages all spawned windows / window divisions, etc -->
		<WindowingSystem />

		<!-- The status bar that shows info and instructions, app-wide. -->
		<StatusBar/>

		<!-- Library of SVG Symbols we'll load in, that our ContextMenu system uses -->
		<MenuIconSVGs/>

		<!-- when we're dragging something (like windows) they will teleport to this layer -->
		<div ref="dragHoverLayerRef" class="dragHoverLayer"></div>

	</div>

</template>
<script setup>

// vue
import { ref } from 'vue';

// components
import TopBar from './TopBar.vue';
import WindowingSystem from './WindowingSystem.vue';
import StatusBar from './StatusBar.vue';
import MenuIconSVGs from './MenuIconSVGs.vue';

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
