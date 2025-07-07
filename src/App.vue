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
				ref="windowManagerEl"
				:availableWindows="availableWindows"
				:defaultLayout="layout"
				:showTopBar="true"
				:showStatusBar="true"
				:topBarComponent="DemoHeader"
				:splitMergeHandles="true"
				:useWindowingDebug="true"
				mwiBGPattern="/mwi_dot.png"
				:theme="{
					systemBGColor: 'black',
					// topBarBGColor: 'red',
					// statusBarBGColor: 'blue',
					// frameBGColor: '#00ABAE',
					// mwiBGColor: '#00ABAE',
					// menuBGColor: 'rgba(0, 0, 0, 0.5)',
					// menuActiveBGColor: '#EFEFEF',
					// menuTextColor: 'red',
					// menuBlur: '20px',
					// menuDisabledTextColor: '#999',
					// frameHeaderColor: 'red',
					// frameTabsHeaderColor: 'green',
					// frameTabsColor: 'darkgreen',
					// frameTabsActiveColor: 'lightgreen',
					// windowTitleTextColor: 'rgb(209, 209, 209)'
					// hamburgerIconColor: 'red',
					// hamburgerIconColorHover: 'pink',
					// hamburgerCircleColor: 'red',
					// hamburgerCircleColorHover: 'pink',
					// closeButtonCircle: '#efefef',
					// closeButtonCircleHover: '#ff0000',
					// closeButtonXColor: 'magenta',
					// closeButtonXColorHover: 'white',
				}"
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
import { ref, onMounted } from 'vue';

// main window manager component
import WindowManager from './components/WindowManager.vue';

// demo window components
import DemoHeader from './DemoWindowComponents/DemoHeader.vue';
import DemoStatusBar from './DemoWindowComponents/DemoStatusBar.vue';
import GoogleWindow from '@demoWindows/GoogleWindow.vue';
import DuckDuckGo from '@demoWindows/DuckDuckGoWindow.vue';
import BasicWindow from '@demoWindows/BasicWindow.vue';
import DemoProps from '@demoWindows/DemoProps.vue';

// lib/misc
import { checkParentsForClass } from '@misc/Utils';
import { useElementPosition } from '@hooks/useElementPosition';
import WindowFrame from '@classes/WindowFrame';

// ref to our window manager element!
const windowManagerEl = ref(null);

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
	},
	{
		window: DemoProps,
		title: 'Demo Props Window',
		slug: 'demoProps',
	}
];

// build a layout to test with
const layout  = [

	{	
		// we'll build layout in hypothetical 1080P space
		name: "window",
		top: 0,
		left: 0,
		bottom: 1080,
		right: 1920
	},
	{
		// Main  editor:
		name: "MainView",
		windows: ['basic'], 
		style: WindowFrame.STYLE.SINGLE,
		left: 0,
		right: ["ref", "window.right-430"],
		top: 0,
		bottom: ["ref", "window.bottom-300"]
	},
	{
		// debug view under main view
		name: "bottom",
		windows: ['basic', 'GoogleWindow', 'ddg', 'demoProps', {kind: 'demoProps', props: {title: 'Layout Title', message: 'This is a layout message!'}}], 
		left: 0,
		style: WindowFrame.STYLE.TABBED,
		//left: ["ref", "VerticalToolBar.right"],
		right: ["ref", "MainView.right"],
		top: ["ref", "MainView.bottom"],
		bottom: ["ref", "window.bottom"]
	},
	{	
		// Tool palette, on right by default
		name: "tools",
		windows: ['basic'], 
		style: WindowFrame.STYLE.TABBED,
		left: ["ref", "MainView.right"],
		right: ["ref", "window.right"],
		top: 0,
		bottom: ["ref", "window.bottom"]
	}
];


// build a layout to test with
const alternateLayout  = [

	{	
		// we'll build layout in hypothetical 1080P space
		name: "window",
		top: 0,
		left: 0,
		bottom: 1080,
		right: 1920
	},
	{
		// Main  editor:
		name: "MainView",
		windows: ['basic'], 
		style: WindowFrame.STYLE.SINGLE,
		left: 300, // 300px from left edge
		right: ["ref", "window.right"],
		top: 0,
		bottom: ["ref", "window.bottom-300"]
	},
	{
		// debug view under main view
		name: "bottom",
		windows: ['basic', 'GoogleWindow', 'ddg'], 
		left: 300,
		style: WindowFrame.STYLE.TABBED,
		//left: ["ref", "VerticalToolBar.right"],
		right: ["ref", "window.right"],
		top: ["ref", "MainView.bottom"],
		bottom: ["ref", "window.bottom"]
	},
	{	
		// Tool palette, on right by default
		name: "tools",
		windows: ['basic'], 
		style: WindowFrame.STYLE.TABBED,
		left: ["ref", "window.left"],
		right: ["ref", "MainView.left"],
		top: 0,
		bottom: ["ref", "window.bottom"]
	}
];
window.al = alternateLayout;

window.bl = [
    {
        "name": "window",
        "top": 0,
        "left": 0,
        "bottom": 1237,
        "right": 2001
    },
    {
        "name": "frame_0",
        "style": 0,
        "windows": [
            "basic"
        ],
        "top": 0,
        "bottom": 790,
        "left": 0,
        "right": 510
    },
    {
        "name": "frame_1",
        "style": 10,
        "windows": [
            "basic",
            "GoogleWindow",
            "ddg"
        ],
        "top": 790,
        "bottom": 1233,
        "left": 0,
        "right": 1150
    },
    {
        "name": "frame_2",
        "style": 10,
        "windows": [
            "basic"
        ],
        "top": 0,
        "bottom": 580,
        "left": 1150,
        "right": 2001
    },
    {
        "name": "frame_3",
        "style": 10,
        "windows": [
            "GoogleWindow"
        ],
        "top": 0,
        "bottom": 790,
        "left": 510,
        "right": 1150
    },
    {
        "name": "frame_4",
        "style": 10,
        "windows": [],
        "top": 580,
        "bottom": 790,
        "left": 1150,
        "right": 2001
    },
    {
        "name": "frame_5",
        "style": 10,
        "windows": [],
        "top": 790,
        "bottom": 1233,
        "left": 1150,
        "right": 1570
    },
    {
        "name": "frame_6",
        "style": 10,
        "windows": [
            "basic"
        ],
        "top": 790,
        "bottom": 1233,
        "left": 1570,
        "right": 2001
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


onMounted(()=>{
	const ctx = windowManagerEl.value?.getContext();
	window.wctx = ctx;
});

</script>
<style lang="scss">

	/*
		note: I turned off "scoped" here, so we are affecting the body, as well.
		
		Since this is basically the top-level page component, makes sense to
		do that here.
	*/
	body {

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
