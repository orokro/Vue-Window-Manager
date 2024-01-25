<!--
	PreferencesViewD.vue
	--------------------

	This is a demo component to be used in place of the Preferences view.
-->
<template>

	<div 
		class="appFrame"
		:style="{
			backgroundColor: bgColor + ' !important'
		}"
	>
		<div class="bgImage"></div>
		<h1>Preferences</h1>
		<p>
			<span v-for="index in 50" :key="index">{{ randomNumber }} &nbsp; &nbsp;</span>
		</p>
	</div>

</template>
<script setup>

// vue
import { onMounted, ref } from 'vue';

// lib/misc
import Window from '../../hooks/classes/Window';

// when we mount the c
const randomNumber = ref(0);
const bgColor = ref('#000000');

// define our props
const props = defineProps({

	// the window frame we represent
	window: {
		type: Window,
		default: null
	}
});


// pick random color & number on mount
onMounted(()=>{

	// when we mount, pick random number so we can see that the component doesn't remount
	// when tab switching or dragging or whatever
	randomNumber.value = Math.floor(Math.random() * 100);

	// pick a random background color, too
	bgColor.value = '#' + Math.floor(Math.random()*16777215).toString(16);

});

</script>
<style lang="scss" scoped>

	// main app container
	.appFrame {
		position: absolute;
		inset: 0px 0px 0px 0px;

		// the uniq bg image for this app
		.bgImage {
			position: absolute;
			inset: 0px 0px 0px 0px;

			background-image: url('../../assets/img/debug/bg_c.png');
			background-size: 100% 100%;
			background-repeat: no-repeat;

			opacity: 0.5;

		}// .bgImage

		color: rgba(255, 255, 255, 0.9);

		h1 {
			font-size: 64px;
			margin: 5px;
			padding: 0px;
		}

		p {
			margin: 0px;
			padding: 0px;
			font-weight: bold;
			font-size: 100px;
		}

	}// .appFrame

</style>
