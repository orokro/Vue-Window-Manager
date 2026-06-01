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
				:is="getComponent(window.kindRef.value)"
				v-bind="window.props"
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

// Provide the frame context to the window-component tree.
//
// IMPORTANT: a window can be dragged/docked from one frame to another, but this
// WindowV component is NOT remounted when that happens (its contents merely
// re-teleport). So we must NOT capture a single frame's context here - that's how
// frameCtx used to go stale and keep targeting the old frame.
//
// Instead we provide a live proxy that resolves the window's _current_ frame on every
// access (via the reactive window.frameRef). Method calls and reactive reads both stay
// correct after a move, with no remount or re-provide required.
const frameCtx = new Proxy({}, {
	get(target, prop) {

		// resolve the frame the window lives in right now (reactive)
		const frame = props.window.frameRef.value
			?? windowMgr.getFrameFromWindow(props.window);
		const ctx = (frame != null) ? frame.frameContext : null;

		// undocked (e.g. mid-drag): expose nothing rather than throw
		if (ctx == null)
			return undefined;

		// forward the property, binding methods back to the real context instance
		const value = ctx[prop];
		return (typeof value === 'function') ? value.bind(ctx) : value;
	}
});
provide('frameCtx', frameCtx);
provide('windowCtx', props.window.ctx);

</script>
<style lang="scss" scoped>

	// all app views spawn inside this
	.appViewContainer {

		// fill parent container
		position: absolute;
		inset: 0px 0px 0px 0px;

		background: var(--theme-windowBGColor);
	}// .appViewContainer

</style>
