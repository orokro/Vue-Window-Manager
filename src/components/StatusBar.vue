<!-- 
	StatusBar.vue
	-------------

	This is the bar that is fixed in height and runs along the bottom of the app.

	Like the TopBar (on the top), it is fixed size and cannot be split/merged like
	other windows in the App's windowing-system.

	This bar will show things like:
		- Tool Tip Text
		- Modal Options for modal-tools
		- Misc Info/Stats
-->
<template>

	<div class="statusBar">
		<slot/>
	</div>

</template>
<script setup>

</script>
<style scoped lang="scss">

	// pull in our global reusable styles & variables
	@import '../css/main.scss';

	// outer most wrapper for the top bar contents
	.statusBar {

		// fill entire width of bottom, with fixed height
		position: absolute;
		inset: auto 0px 0px 0px;
		height: 30px;
		box-sizing: border-box;
		
		// black bar on top
		border-top: 2px solid var(--theme-systemBGColor);

		background-color: var(--theme-statusBarBGColor);
		color: #5d5e62;
		
	}// .statusBar

</style>
