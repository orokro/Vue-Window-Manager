<!--
	BasicWindow.vue
	---------------

	A basic demo window to test our layout and functionality.
-->
<template>

	<div class="basicWindow">

		<div class="title">{{ title }}</div>
		<div class="content">

			<h2>Random Number:</h2>
			<p>
				{{ randomNumberOnStartUp }}
			</p>
			
			<h2>Buttons</h2>
			<button type="button" @click="testFrameContext">Print Frame Context</button>
			<button type="button" @click="printFrameDim">Print Frame Dim</button>
			<br><br>
			<input type="text" v-model="spawnTitle" placeholder="Window Title" />
			<input type="text" v-model="spawnMessage" placeholder="Window Message" />
			<button type="button" @click="spawnPropsWindow">Spawn Props Window</button>
			<br><br>
			<input type="text" v-model="newTitle" placeholder="Change Window Title" />
			<button type="button" @click="doChangeTitle">Change Title</button>
			<button type="button" @click="changeAllTitles">Change All Titles</button>
			<br/><br/>
			<button type="button" @click="windowCtx.close()">Close Window</button>
			<button type="button" @click="frameCtx.closeAllWindows()">Close All Windows In Frame</button>
			<br/><br/>
			<button type="button" @click="windowCtx.setKind('ddg')">Change to DuckDuckGo</button>
			<button type="button" @click="windowCtx.setKind('GoogleWindow')">Change to GoogleWindow</button>			
			<br/><br/>
			<button type="button" @click="printFrameStyle">Log Frame Style</button>
			<button type="button" @click="frameCtx.setFrameStyle('0')">Set Single</button>
			<button type="button" @click="frameCtx.setFrameStyle('tabbed')">Set Tabbed</button>
			<button type="button" @click="frameCtx.setFrameStyle(WindowFrame.STYLE.MWI)">Set MWI</button>
			<br/><br/>
			<h2>Other Stuffs:</h2>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
				Vestibulum in neque at enim facilisis tincidunt. 
				Phasellus non felis nec leo efficitur aliquet. 
				Sed euismod, nunc vel tincidunt facilisis, 
				justo enim commodo ligula, a bibendum quam erat id est.
			</p>
		</div>
	</div>
</template>
<script setup>

// vue
import { ref, inject } from 'vue';
import WindowFrame from '../classes/WindowFrame';

// define our props
const props = defineProps({

	title: {
		type: String,
		default: 'Basic Window'
	}
});

const randomNumberOnStartUp = ref(Math.floor(Math.random() * 100));

const frameCtx = inject('frameCtx');
const windowCtx = inject('windowCtx');

const newTitle = ref("New Title!");
const spawnTitle = ref("A");
const spawnMessage = ref("B");
			

const spawnPropsWindow = () => {

	if (frameCtx) {
		// spawn a new props window with the title and message from the input fields
		frameCtx.addWindow('demoProps', {
			title: spawnTitle.value,
			message: spawnMessage.value
		});
	} else {
		console.warn("No frame context available!", frameCtx);
	}
};


const printFrameStyle = () => {

	if (frameCtx) {
		const frameStyle = frameCtx.getFrameStyle();
		console.log("Frame Style:", frameStyle);
	} else {
		console.warn("No frame context available!", frameCtx);
	}
};


const testFrameContext = () => {
	
	if (frameCtx) {

		// get list of window string slugs
		const windowSlugs = frameCtx.getAvailableWindowKinds();
		console.log(windowSlugs);
		
		// pick a random slug from the above array
		const randomSlug = windowSlugs[Math.floor(Math.random() * windowSlugs.length)];

		// test context by adding a random window to the frame we're currently in
		frameCtx.addWindow(randomSlug);

	} else {
		console.warn("No frame context available!", frameCtx);
	}
};


const printFrameDim = () => {

	if (frameCtx) {
		const frameDim = frameCtx.getFrameDimensions();
		console.log("Frame Dimensions:", frameDim);
	} else {
		console.warn("No frame context available!", frameCtx);
	}
};


const doChangeTitle = () => {

	console.log(windowCtx);
	
	if (windowCtx) {
		windowCtx.setTitle(newTitle.value);
	} else {
		console.warn("No window context available!", windowCtx);
	}
};


const changeAllTitles = () => {

	const windows = frameCtx.getWindows();
	console.log('Windows in Frame', windows);
	windows.map(window=>{
		window.setTitle(newTitle.value);
	});
};

</script>
<style lang="scss" scoped>

	.basicWindow {

		width: 100%;
		height: 100%;
		position: relative;
		background-color: #f0f0f0;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;

		.title {
			background-color: #007bff;
			color: white;
			padding: 10px;
			font-size: 1.2em;
			text-align: center;
			
		}// .title

		.content {
			padding: 20px;
			flex-grow: 1;

			h2 {
				margin-top: 0;
			}

		}// .content

	}// .basicWindow

</style>
