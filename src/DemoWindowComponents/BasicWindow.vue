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
			<br><br>
			<button type="button" @click="printFrameDim">Print Frame Dim</button>
			
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

// define our props
const props = defineProps({

	title: {
		type: String,
		default: 'Basic Window'
	}
});

const randomNumberOnStartUp = ref(Math.floor(Math.random() * 100));

const frameCtx = inject('frameCtx');

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

</script>
<style lang="scss" scoped>

	.basicWindow {

		width: 100%;
		height: 100%;
		position: relative;
		background-color: #f0f0f0;
		border: 1px solid #ccc;
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
			border-top-left-radius: 8px;
			border-top-right-radius: 8px;
			
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
