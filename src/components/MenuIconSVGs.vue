<!--
	MenuIconSVGs.vue
	----------------

	The library we're using for popup context menus uses SVGs for it's icons.
	Specifically we're using @imengyu/vue3-context-menu, and it's quirky.

	Anyway, it lets you specify a SVG Symbol by #ID, so hopefully
	we can just stick all our menu icons in this component, instead of cluttering up the components where
	there needed.

	This will just export a SVG that has a symbol library to use as menu icons.	
-->
<template>

	<!-- svg data to use with our Chinese menu system -->
	<svg viewBox="0 0 80 20" xmlns="http://www.w3.org/2000/svg">

		<!-- Merge Icons -->
		<symbol id="iconSplitFrame" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_split.png" height="16" width="16" />
		</symbol>
		<symbol id="iconHSplit" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_split_horizontal.png" height="16" width="16" />
		</symbol>
		<symbol id="iconVSplit" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_split_vertical.png" height="16" width="16" />
		</symbol>
		<symbol id="iconFrameTabbed" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_mode_tabbed.png" height="16" width="16" />
		</symbol>
		<symbol id="iconFrameSingle" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_mode_single.png" height="16" width="16" />
		</symbol>
		<symbol id="iconFrameMWI" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_mode_mwi.png" height="16" width="16" />
		</symbol>

		
		<!-- Merge Icons -->
		<symbol id="iconMergeUp" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_merge_up.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeDown" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_merge_down.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeLeft" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_merge_left.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeRight" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons_light/wf_merge_right.png" height="16" width="16" />
		</symbol>
	</svg>

</template>
<script setup>

// do nothing
	
</script>
<style lang="scss" scoped>

	// do nothing

</style>
