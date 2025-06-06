<!--
	DemoStatusBar.vue
	-----------------

	A component to simulate a status bar, with a monospace, rounded corner message on the left, like
	"Hello Status Bar!", and a version number on the right side of the bar.
-->
<template>

	<div class="statusBar">
		<div class="statusBarMessage">
			{{ message }}
		</div>
		<div class="statusBarVersion">
			Version {{ version }}
		</div>
	</div>

</template>
<script setup>

// vue
import { ref } from 'vue';

// props
const props = defineProps({

	message: {
		type: String,
		default: 'Hello Status Bar!'
	},

	version: {
		type: String,
		default: '1.0.0'
	}

});

</script>
<style lang="scss" scoped>

	.statusBar {

		// fill entire width of bottom, with fixed height
		width: 100%;
		height: 100%;
		box-sizing: border-box;

		color: #5d5e62;

		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 0 10px;

		font-family: monospace;
		font-size: 14px;

		.statusBarMessage {
			flex-grow: 1;

		}// .statusBarMessage

		.statusBarVersion {
			flex-shrink: 0;
			margin-left: 10px;
			font-weight: bold;

		}// .statusBarVersion

	}// .statusBar

</style>
