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
		class="windowManager"
		:style="{
			...cssVars,
			'--window-system-inset': windowSystemInset,
		}"
	>
		<!-- The top bar with menus and controls that cannot be replaced. -->
		<TopBar v-if="showTopBar">
			<slot name="topBar">
				<component v-if="topBarComponent!=null" :is="topBarComponent" />
			</slot>
		</TopBar>

		<!-- wrapper to position the windowing system to make room for the top / status bars if enabled -->
		<div 
			ref="containerRef"
			class="windowingSystemWrapper"
		>
		
			<!-- The component that manages all spawned windows / window divisions, etc -->
			<WindowingSystem />
		
		</div>

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

// styles
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';

// vue
import { ref, provide, computed, watch, onMounted } from 'vue';

// components
import TopBar from './TopBar.vue';
import WindowingSystem from './WindowingSystem.vue';
import StatusBar from './StatusBar.vue';
import MenuIconSVGs from './MenuIconSVGs.vue';

// classes
import WindowManager from '@classes/WindowManager';
import WindowManagerContext from '../classes/WindowManagerContext';

// hooks
import { useElementPosition } from '@hooks/useElementPosition';

// set up some props
const props = defineProps({

	// the list of available window components we can spawn as windows
	availableWindows: {
		type: Array,
		default: () => []
	},
	
	// the layout to use for the windows
	defaultLayout: {
		type: Array,
		default: null,
	},

	// if we want to use the debug mode, which will show some extra info
	useWindowingDebug: {
		type: Boolean,
		default: false
	},

	// true if we should show the top bar
	showTopBar: {
		type: Boolean,
		default: false
	},

	// true if we should show the status bar
	showStatusBar: {
		type: Boolean,
		default: false
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
	},

	// turn on/off split merge handles:
	splitMergeHandles: {
		type: Boolean,
		default: true
	},

	// optional background image for MWI frames
	mwiBGPattern: {
		type: String,
		default: null
	},

	// theme color object
	theme: {
		type: Object,
		default: () => ({})
	}

});

// make local copies from our props
const showTopBar = ref(props.showTopBar);
const showStatusBar = ref(props.showStatusBar);
const splitMergeHandles = ref(props.splitMergeHandles);

// allow them to be updated
const emit = defineEmits(['update:showTopBar', 'update:showStatusBar', 'update:splitMergeHandles'])

// get HTML DOM ref to the main container for this component, so we can compute
// x/y position for offsetting mouse coordinates
const containerRef = ref(null);

// track the position of the container element, so we can offset mouse coordinates
const containerPosition = useElementPosition(containerRef, false);

// default theme colors
const defaultThemeColors = {

	// background colors
	systemBGColor: '#000',
	topBarBGColor: '#31313B',
	statusBarBGColor: '#31313B',
	frameBGColor: '#737378',
	windowBGColor: '#EFEFEF',
	mwiBGColor: '#39393E',
	menuBGColor: '#31313B',
	menuActiveBGColor: '#4A4A4E',

	// header colors for windows & tabs
	frameHeaderColor: '#5C5C60',
	frameTabsHeaderColor: '#2E2E30',
	frameTabsColor: '#4A4A4E',
	frameTabsActiveColor: '#737378',

	// text colors
	windowTitleTextColor: '#fff',
	tabTextColor: '#fff',
	activeTabTextColor: '#fff',
	menuTextColor: '#fff',
	menuActiveTextColor: '#fff',

	// misc other
	hamburgerIconColor: '#fff',			 
};


// make a new window manager if one doesn't exist yet
const windowMgr = new WindowManager(
	props.availableWindows,
	props.defaultLayout,
	containerPosition, 
	props.useWindowingDebug
);

// set settings on windowMgr
windowMgr.showBlenderSplitMergeHandles.value = props.splitMergeHandles;

// provide the window manager for all our components down stream
provide('windowManager', windowMgr);

// affect the CSS for our windowing system
const windowSystemInset = computed(() => {
	const topInset = showTopBar.value ? 38 : 1;
	const bottomInset = showStatusBar.value ? 28 : 1;
	return `${topInset}px 1px ${bottomInset}px 1px`;
});

// dom refs
const dragHoverLayerRef = ref(null);


// set image path to use for MWI windows
import defaultMWIImage from '@assets/img/mwi_bg.png';
function setMWIPath(){
	console.log(defaultMWIImage);
	windowMgr.mwiBGImagePath.value = props.mwiBGPattern || defaultMWIImage;
}
setMWIPath();

// ref-based theme color map
const themeColors = {};
const cssVars = ref({});

/**
 * Updates our theme colors based on the provided theme object.
 * 
 * @param theme - the theme object to use for colors
 */
function updateThemeColors(theme = {}) {

	// use empty object if we got the wrong type
	if (!theme || typeof theme !== 'object') {
		theme = {};
	}

	// build obect of CSS vars to use in our template
	const nextCssVars = {};

	// loop over the keys in our default theme colors
	for (const key in defaultThemeColors) {

		const incoming = theme[key] ?? defaultThemeColors[key];

		// if the key doesn't exist in our themeColors map, or if it does but the value is different,
		if (!(key in themeColors))
			themeColors[key] = ref(incoming);

		// otherwise, update the value if it is different
		else if (themeColors[key].value !== incoming)
			themeColors[key].value = incoming;
		
		// set the CSS variable for this key
		nextCssVars[`--theme-${key}`] = themeColors[key].value;

	}// next key

	// set the CSS vars ref to the new object
	cssVars.value = nextCssVars;
}

// provide the theme colors and css vars to all components
provide('themeColors', themeColors);
updateThemeColors(props.theme);

// set up some watches incase our props change
watch(() => props.showTopBar, (newVal) => {
	showTopBar.value = newVal;
}, { immediate: true });

watch(() => props.showStatusBar, (newVal) => {
	showStatusBar.value = newVal;
}, { immediate: true });

watch(() => props.splitMergeHandles, (newVal) => {
	splitMergeHandles.value = newVal;
}, { immediate: true });

watch(() => props.availableWindows, (newVal) => {
	windowMgr.availableWindowList.setAvailableWindows(newVal);
}, { immediate: true });

watch(() => props.splitMergeHandles, (newVal) => {
	windowMgr.showBlenderSplitMergeHandles.value = newVal;
}, { immediate: true });

watch(
	() => props.theme,
	(newTheme) => updateThemeColors(newTheme),
	{ deep: true }
);

// emit events when certain properties change
watch(() => showTopBar.value, (newVal) => {
	emit('update:showTopBar', newVal);
});

watch(() => showStatusBar.value, (newVal) => {
	emit('update:showStatusBar', newVal);
});

watch(() => splitMergeHandles.value, (newVal) => {
	emit('update:splitMergeHandles', newVal);
	windowMgr.showBlenderSplitMergeHandles.value = newVal;
});

watch(() => props.mwiBGPattern, (newVal) => {
	setMWIPath();
});

// make a context object to return if requested
const ctx = new WindowManagerContext(windowMgr, {
	showTopBar,
	showStatusBar,
	splitMergeHandles,
});


/**
 * Function to expose publicly to get the context
 */
function getContext() {
	return ctx;
}


// allow components to access the window manager context
defineExpose({
	getContext,
});


// onMounted hook to set up the window manager
onMounted(()=>{

	// update theme on mounted
	updateThemeColors(props.theme);
});


</script>
<style lang="scss">

	// main component!
	.windowManager {

		// fill parent container always
		width: 100%;
		height: 100%;
		position: absolute;
		inset: 0px 0px 0px 0px;

		// fill bg w/ black
		background: var(--theme-systemBGColor);

		// wrapper around the part where the windows spawn/divide/join, etc
		.windowingSystemWrapper {

			// for debug
			/* border: 1px solid yellow; */

			position: absolute;
			inset: var(--window-system-inset);

		}// .windowingSystemWrapper

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
