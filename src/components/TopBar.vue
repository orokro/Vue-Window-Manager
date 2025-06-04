<!-- 
	TopBar.vue
	----------

	This is the bar that is fixed in height and runs along the top of the app.

	Like the status bar (on the bottom), it is fixed size and cannot be split/merged like
	other windows in the App's windowing-system.
-->
<template>

	<div class="topBar">
		<slot/>
	</div>

</template>
<script setup>

</script>
<style scoped lang="scss">

	// pull in our global reusable styles & variables
	@import '../css/main.scss';

	// outer most wrapper for the top bar contents
	.topBar {

		// fill entire width of top, with fixed height
		position: absolute;
		inset: 0px 0px auto 0px;
		height: 40px;

		// black bar on bottom
		border-bottom: 2px solid black;

		background-color: $panel-bg-default;
		color: #5d5e62;

		padding: 6px 10px;	

	}// .topBar

</style>
