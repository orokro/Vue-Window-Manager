<!-- 
	App.vue
	-------

	The main top-level component for the entire app.
-->
<template>
	<main @contextmenu="disableContextMenus">

		<div class="demoBox">

			<WindowManager/>
		</div>

		<div v-if="false" ref="testThingEl" class="testThing">
			<pre>
{{ pos }}
			</pre>
		</div>

		<div class="demoBox box2">

			<WindowManager/>
		</div>

	</main>
</template>
<script setup>

// vue
import { ref } from 'vue';

// lib/misc
import { checkParentsForClass } from '@misc/Utils';

// main window component
import WindowManager from './components/WindowManager.vue';

import { useElementPosition } from '@hooks/useElementPosition';

const testThingEl = ref(null);

const pos = useElementPosition(testThingEl);


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
		/* overflow: clip; */

	}// body

	.demoBox {

		position: absolute;
		top: 50px;
		left: 150px;
		width: 1200px;
		height: 800px;

		/* border: 2px solid red; */
		border-radius: 5px;
		overflow: clip;

		&.box2 {
			left: 300px;
			top: 950px;
		}
	}

	.testThing {

		position: absolute;
		top: 100px;
		left: 300px;

		width: 200px;
		height: 200px;

		border: 2px solid red;
		border-radius: 5px;
		background: rgba(0, 0, 0, 0.5);

		padding: 5px;
		font-size: 11px;
		color: white;
	}

</style>
