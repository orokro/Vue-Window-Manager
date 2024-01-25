<!--
	WindowPen.vue
	-------------

	Right, so - our WindowManager uses WindowFrames to layout / split / merge / resize the panels on the
	screen. Windows, however, live inside these WindowFrames.

	The way we accomplish the drag-n-drop ability to move windows from one frame to another,
	is via the <Teleport> feature of Vue3.

	This allows us to dynamically set the parent DOM node of a component, _somewhere else_ in the hierarchy
	than where it was spawned in the component tree.

	So, this creates a few problems for us:
		- first, the WindowFrames that windows belong to have to be mounted before they can be teleported there
		- the windows need a place to live and be mounted before they can be teleported

	The solution is the WindowPen, which this file provides.

	In WindowingSystem.vue we will instantiate a single instance of this WindowPen.vue component.
	This will be an invisible component, but it will act as the default Teleport target for windows,
	until their WindowFrame becomes mounted, in which case the Teleport will switch that that.

	So, the only styles we need here is to hide everything, this is just the holding pen for all
	instantiated windows to mount and teleport FROM ... TO a frame.
-->
<template>

	<!-- basically invisible container to hold windows until they're teleported -->
	<div ref="thePenRef" class="thePen">

		<!-- spawn each window -->
		<WindowV
			v-for="(win, idx) in windowMgr.windowsRef.value"
			:key="win.windowID"
			:pen-container-element="thePenRef"
			:window="win"
		/>

	</div>
</template>
<script setup>

// vue
import { ref } from 'vue';

// components
import WindowV from './WindowV.vue';


// hooks
import useWindowManagement from '../hooks/useWindowManagement';

// invoke hooks
const { windowMgr } = useWindowManagement();

// DOM refs
const thePenRef = ref(null);

</script>
<style lang="scss" scoped>

	// windows spawn inside here, make it inaccessible to user
	.thePen {

		// no render at all
		display: none;

		// make other impossible to render conditions
		position: fixed;
		top: -1px;
		left: 1px;
		width: 1px;
		height: 1px;

		// nothing can escape even it it was visible
		overflow: clip;

	}// .thenPen

</style>
