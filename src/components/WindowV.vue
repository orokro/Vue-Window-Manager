<!--
	WindowV.vue
	-----------

	This is the component that renders the _contents_ of a Window.

	Note that it is called WindowV with a "V" so we can separate it with the class of the same name.

	Further, the tabs or title bars are rendered as part of the WindowFrameHeader.vue or WindowFrameV.vue
	components.

	This just represents the contents of a Window.

	Lastly, since windows are docked inside frames and can be dragged-and-dropped between WindowFrame panels,
	this window will be spawned inside the WindowPen.vue component, but it's actual contents will use
	Vue3's <Teleport> component to actually place the contents in the frames.

	This way the contents can stay reactive and consistent even during drag operations,
	without having to rebuild (and remount) the component.

	That's also because the component will have some state itself (like maybe scroll position for instance),
	and remounting the component after a drag-and-drop would be jarring.
-->
<template>

	<!-- the magic - teleport to either the Pen, or to the window frames container -->
	<Teleport :to="(window.domContainer.value!=null) ? window.domContainer.value : penContainerElement">
	
		<!-- spawn app views here -->
		<div class="appViewContainer">

			<component 
				v-if="window.kind!=null"
				:is="getComponent(window.kind)"
			/>
		</div>
	</Teleport>
	
</template>
<script setup>

// vue
import { provide } from 'vue';

// lib/misc
import Window from '@classes/Window';

// define our props
const props = defineProps({

	// the holding pen if we don't have a mounted window container yet
	penContainerElement: {
		default: null,
	},

	// the window frame we represent
	window: {
		type: Window,
		default: null
	}
});

// get the window manager from the window
const windowMgr = props.window.mgr;

// returns the constructor for our component
function getComponent(kind) {
	return windowMgr.availableWindowList.getWindowBySlug(kind).window;
}

// get the frame context from the window manager & provide it to the component tree
const frameCtx = windowMgr.getFrameFromWindow(props.window).frameContext;
provide('frameCtx', frameCtx);

</script>
<style lang="scss" scoped>

	// all app views spawn inside this
	.appViewContainer {

		// fill parent container
		position: absolute;
		inset: 0px 0px 0px 0px;

	}// .appViewContainer

</style>
