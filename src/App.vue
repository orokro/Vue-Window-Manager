<!-- 
	App.vue
	-------

	The main top-level component for the entire app.
-->
<template>
	<main @contextmenu="disableContextMenus">

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

	</main>
</template>
<script setup>

// vue
import { ref } from 'vue';

// components
import TopBar from './components/TopBar.vue';
import WindowingSystem from './components/WindowingSystem.vue';
import StatusBar from './components/StatusBar.vue';
import MenuIconSVGs from './components/MenuIconSVGs.vue';

// lib/misc
import { checkParentsForClass } from '../src/misc/Utils';

// dom refs
const dragHoverLayerRef = ref(null);

/**
 * Disable right-click context menu from browser, unless Shift is held, for debug
 * @param {Event} event - JS Event object
 */
function disableContextMenus(event){

	// if a parent element enable right click, we're good
	if(checkParentsForClass(event.target, 'rightclick_allowed')!=false)
		return;

	if(event.shiftKey==false){
		event.preventDefault();
		return false;
	}
}


</script>
<style lang="scss">

	/*
		note: I turned off "scoped" here, so we are affecting the body, as well.
		
		Since this is basically the top-level page component, makes sense to
		do that here.
	*/
	body {

		// black bg by default
		background: black;
		
		// default page font styles
		font-family: sans-serif;

		// don't let body ever scroll
		overflow: clip;

	}// body

	// affect all DIVS with these base properties
	div {
		box-sizing: border-box;

	}// div

	// fill the entire screen
	.dragHoverLayer {
		
		// fill screen, always on top
		position: fixed;
		inset: 0px 0px 0px 0px;
		z-index: 9001;

		// no pointer events on this bad boy
		pointer-events: none;

		// for debug
		// background: rgba(255, 0, 0, 0.2);

	}// .dragHoverLayer

</style>
