<!--
	DemoProps.vue
	-------------

	This component demonstrates props being passed into a window component.
-->
<template>

	<div class="propsWindow">

		<div class="title">{{ title }}</div>
		<div class="content">

			<h2>Message From Props:</h2>
			<p>{{ message }}</p>
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
		default: 'Props Window'
	},

	message: {
		type: String,
		default: 'This is a demo props window!'
	}
});

const frameCtx = inject('frameCtx');
const windowCtx = inject('windowCtx');


</script>
<style lang="scss" scoped>

	.propsWindow {

		width: 100%;
		height: 100%;
		position: relative;
		background-color: #f0f0f0;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;

		.title {
			background-color: #00ABAE;
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

	}// .propsWindow

</style>
