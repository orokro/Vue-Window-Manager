<!--
	GoogleWindow.vue
	----------------

	Loads Google in a sandboxed iFrame, with an optional query parameter
-->
<template>

	<div class="googleWindow">
		<iframe
			ref="iframeRef"
			:sandbox="sandbox"
			:src="src"
			frameborder="0"
			class="googleFrame"
		></iframe>
	</div>

</template>
<script setup>

// vue
import { ref, computed, onMounted } from 'vue';

// define props
const props = defineProps({

	// the query to search for
	query: {
		type: String,
		default: ''
	}
});

// get a ref to the iframe
const iframeRef = ref(null);

// compute the src for the iframe
const src = computed(() => {
	const baseUrl = 'https://www.ticalc.org';
	const params = new URLSearchParams();
	if (props.query) {
		params.set('q', props.query);
	}
	return `${baseUrl}?${params.toString()}`;
});

// define the sandbox attributes for the iframe
const sandbox = computed(() => {
	return 'allow-same-origin allow-scripts allow-popups allow-forms';
});

</script>
<style lang="scss" scoped>

	.googleWindow {
		
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;

		.googleFrame {
			width: 100%;
			height: 100%;
			border: none;
		
		}// .googleFrame

	}// googleWindow

</style>
