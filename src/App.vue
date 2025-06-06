<!-- 
	App.vue
	-------

	The main top-level component for the entire app.
-->
<template>
	<main @contextmenu="disableContextMenus">

		<!-- show a single full screen window manager by default -->
		<template v-if="showDoubleTest==false">
			<WindowManager
				:availableWindows="availableWindows"
				:showTopBar="true"
				:showStatusBar="true"
				:topBarComponent="DemoHeader"
			>
				<template #statusBar>
					<DemoStatusBar/>
				</template>
			</WindowManager>
		</template>

		<!-- unless we have the double test mode on (for dev testing) -->
		<template v-else>

			<div class="demoBox">
				<WindowManager
					:showTopBar="true"
					:showStatusBar="true"					
				/>
			</div>
			<div class="demoBox box2">
				<WindowManager/>
			</div>

		</template>
		
		<!-- debug box to test our code that monitors element positions -->
		<div v-if="showTestThing" ref="testThingEl" class="testThing">
			<pre>
{{ pos }}
			</pre>
		</div>

	</main>
</template>
<script setup>

// vue
import { ref } from 'vue';

// main window manager component
import WindowManager from './components/WindowManager.vue';

// demo window components
import DemoHeader from './DemoWindowComponents/DemoHeader.vue';
import DemoStatusBar from './DemoWindowComponents/DemoStatusBar.vue';
import GoogleWindow from '@demoWindows/GoogleWindow.vue';
import DuckDuckGo from '@demoWindows/DuckDuckGoWindow.vue';
import BasicWindow from '@demoWindows/BasicWindow.vue';

// lib/misc
import { checkParentsForClass } from '@misc/Utils';
import { useElementPosition } from '@hooks/useElementPosition';

// for demoing the tracking of an element position on screen
const testThingEl = ref(null);
const pos = useElementPosition(testThingEl);

// some const flags to toggle the demo view
const showTestThing = ref(false);
const showDoubleTest = ref(false);

// list of windows to allow in our WindowManager
const availableWindows = [
	{
		window: GoogleWindow,
		title: "TiCalc!",
		icon: 'https://ticalc.org/favicon.ico',
	},
	{
		window: DuckDuckGo,
		title: "Duck Duck Gooooo",
		slug: "ddg",
		icon: 'https://duckduckgo.com/favicon.ico',
	},
	{
		window: BasicWindow,
		title: "Basic Window",
		slug: "basic",
		icon: 'http://localhost:5173/icons/window_icon.png',
	}
];


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

			border: 2px solid red;
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
