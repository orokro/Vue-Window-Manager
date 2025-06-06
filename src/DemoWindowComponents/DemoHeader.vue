<!--
	DemoHeader.vue
	--------------

	A demo top-bar to test the window header component.
-->
<template>

	<div class="demoTopBar">
		
		<!-- loop to generate 10 divs -->
		<div 
			v-for="index in 10" 
			:key="index" 
			class="demoBoxIcon"
			:style="{ backgroundColor: '#' + Math.floor(Math.random()*16777215).toString(16) }"
		>
		</div>

	</div>

</template>
<script setup>

// vue
import { ref } from 'vue';

</script>
<style lang="scss" scoped>

	.demoTopBar {

		// for debug
		/* border: 2px solid red;
		background: white; */

		// box settings
		height:100%;
		width: 100%;
		box-sizing: border-box;

		// layout
		display: flex;
		flex-direction: row;
		justify-content: start;
		align-items: center;
		
		// fake icons to layout
		.demoBoxIcon {
			
			margin-left: 10px;

			width: 30px;
			height: 30px;

			border-radius: 5px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		
		}// .demoBoxIcon

	}// .demoTopBar

</style>
