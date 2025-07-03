<!--
	MenuIconSVGs.vue
	----------------

	The library we're using for popup context menus uses SVGs for it's icons.
	Specifically we're using @imengyu/vue3-context-menu@1.2.10, and it's quirky.

	Anyway, it lets you specify a SVG Symbol by #ID, so hopefully
	we can just stick all our menu icons in this component, instead of cluttering up the components where
	there needed.

	This will just export a SVG that has a symbol library to use as menu icons.
	
-->
<template>

	<!-- svg data to use with our Chinese menu system -->
	<svg viewBox="0 0 80 20" xmlns="http://www.w3.org/2000/svg">

		<!-- SplitFrame Icon -->
		<symbol id="iconSplitFrame" viewBox="0 0 550 512">
			<path d="M491.253,2.95c-0.4-1.2-1.6-2.4-2.8-2.8c-1.2-0.4-2.8,0-4,1.2l-284,284c-0.4,0.4-0.4,0.4-0.4,0.8c-0.4,0-0.8,0.4-0.8,0.4
				l-172.8,172.8c-6,6-9.2,13.6-9.2,22c0,8.4,3.2,16,8.8,22c6,5.6,14,8.8,22,8.8s15.2-2.8,20.8-8c0.4,0,1.2-0.4,1.6-0.8l171.2-171.2
				l59.2,59.2c0.8,0.8,2,1.2,2.8,1.2s2-0.4,2.8-1.2c118.4-118.4,162.4-217.2,178.4-279.6C502.453,43.75,491.653,4.55,491.253,2.95z"
				/>
		</symbol>

		<!-- SplitFrame Icon -->
		<symbol id="iconHSplit" viewBox="0 0 500 500">
			<path
				id="rect1"
				d="M 478.58312,278.69191 V 221.3081 c 0,-8.87847 -7.14764,-16.02611 -16.0261,-16.02611 H 37.442997 c -8.878466,0 -16.026116,7.14764 -16.026116,16.02611 v 57.38381 c 0,8.87845 7.14765,16.0261 16.026116,16.0261 H 462.55702 c 8.87846,0 16.0261,-7.14765 16.0261,-16.0261 z"
				style="fill:#000000;stroke-width:1;stroke-linejoin:round"
				sodipodi:nodetypes="sssssssss" />
		</symbol>

		<!-- SplitFrame Icon -->
		<symbol id="iconVSplit" viewBox="0 0 500 500">
			<path
				id="rect1"
				d="M 278.69191,21.416881 H 221.3081 c -8.87847,0 -16.02611,7.14764 -16.02611,16.0261 V 462.557 c 0,8.87847 7.14764,16.02612 16.02611,16.02612 h 57.38381 c 8.87845,0 16.0261,-7.14765 16.0261,-16.02612 V 37.442981 c 0,-8.87846 -7.14765,-16.0261 -16.0261,-16.0261 z"
				style="fill:#000000;stroke-width:1;stroke-linejoin:round" />
		</symbol>

		<!-- Tabbed Window Icon -->
		<symbol id="iconFrameTabbed" viewBox="0 0 500 500">
			<path
				id="rect2"
				style="fill:#000000;stroke-width:1.20041;stroke-linejoin:round"
				d="M 18.189602,25.668137 C 8.370053,25.668106 0.40972732,33.150984 0.40975905,42.381572 0.40505234,173.81924 0.5608857,305.25686 0.66568325,436.69447 0.67301925,445.92712 8.6372174,453.40798 18.458961,453.4079 H 481.8104 c 9.81955,3e-5 17.77987,-7.48284 17.77984,-16.71343 V 130.78909 c 3e-5,-9.23058 -7.96029,-16.71346 -17.77984,-16.71343 H 261.29503 c -9.81955,3e-5 -17.77987,-7.48285 -17.77984,-16.713436 V 42.381572 c 3e-5,-9.230587 -7.96029,-16.713464 -17.77984,-16.713435 z M 40.198068,58.959685 H 203.65019 c 5.37272,0 9.69769,4.065563 9.69769,9.116037 v 3.03908 c 0,5.050473 -4.32497,9.116037 -9.69769,9.116037 H 40.198068 c -5.372722,0 -9.698329,-4.065564 -9.698329,-9.116037 v -3.03908 c 0,-5.050474 4.325607,-9.116037 9.698329,-9.116037 z M 81.002816,170.42582 H 419.26654 c 7.26572,-5e-5 13.15575,5.29843 13.15571,11.83442 v 202.96307 c 4e-5,6.53599 -5.88999,11.83447 -13.15571,11.83442 H 81.002816 c -7.265714,5e-5 -13.155751,-5.29843 -13.155707,-11.83442 V 182.26024 c -4.4e-5,-6.53599 5.889993,-11.83447 13.155707,-11.83442 z"
				sodipodi:nodetypes="cccccccccccccsssssssssccccccccc" />
		</symbol>

		<!-- Single Window Icon -->
		<symbol id="iconFrameSingle" viewBox="0 0 500 500">
			<path
				id="path18"
				style="fill:#000000;stroke-width:1.20041;stroke-linejoin:round"
				d="M 18.189602,25.668137 C 8.370053,25.668106 0.40972732,33.150984 0.40975905,42.381572 0.40505234,173.81924 0.5608857,305.25686 0.66568325,436.69447 0.67301925,445.92712 8.6372174,453.40798 18.458961,453.4079 H 481.8104 c 9.81955,3e-5 17.74775,-7.48284 17.74772,-16.71343 0,-77.77634 0,-288.56018 0,-394.312898 3e-5,-9.230587 -7.99241,-16.713464 -17.81196,-16.713435 z m 22.008466,33.291548 419.462932,0 c 5.37272,0 9.69769,4.065563 9.69769,9.116037 v 3.03908 c 0,5.050473 -4.32497,9.116037 -9.69769,9.116037 l -419.462932,0 c -5.372722,0 -9.698329,-4.065564 -9.698329,-9.116037 v -3.03908 c 0,-5.050474 4.325607,-9.116037 9.698329,-9.116037 z M 81.002816,170.42582 H 419.26654 c 7.26572,-5e-5 13.15575,5.29843 13.15571,11.83442 v 202.96307 c 4e-5,6.53599 -5.88999,11.83447 -13.15571,11.83442 H 81.002816 c -7.265714,5e-5 -13.155751,-5.29843 -13.155707,-11.83442 V 182.26024 c -4.4e-5,-6.53599 5.889993,-11.83447 13.155707,-11.83442 z"
				sodipodi:nodetypes="cccccccccsssssssssccccccccc" />
		</symbol>

		<!-- Multi Window Icon -->
		<symbol id="iconFrameMWI" viewBox="-20 0 520 500">
			<g
				id="g19"
				transform="translate(0,-41.23251)">
				<path
					id="rect5"
					style="display:inline;fill:#000000;stroke-width:1.50526;stroke-linejoin:round"
					d="m 25.914234,241.10893 c -14.62145,0 -26.3922852,10.46975 -26.3922852,23.47502 v 210.96172 c 0,13.00527 11.7708352,23.47501 26.3922852,23.47501 H 280.11619 c 14.62145,0 26.39311,-10.46974 26.39311,-23.47501 V 434.83721 H 201.13068 c -14.62145,0 -26.39228,-10.47048 -26.39228,-23.47575 V 320.66823 H 59.892892 c -14.621468,0 -26.393115,-10.46972 -26.393115,-23.47501 v -56.08429 z"
					sodipodi:nodetypes="sssssscsscsscs" />
				<path
					id="rect5-1"
					style="display:inline;fill:#000000;stroke-width:1.50526;stroke-linejoin:round"
					d="m 444.66899,194.71278 v 102.48044 c 0,13.00529 -11.77165,23.47501 -26.39312,23.47501 H 223.64582 v 57.40222 c 0,13.00528 11.77082,23.47501 26.39228,23.47501 h 224.04767 c 14.62147,0 26.39228,-10.46973 26.39228,-23.47501 V 218.18853 c 0,-13.00528 -11.77081,-23.47575 -26.39228,-23.47575 z"
					sodipodi:nodetypes="csscssssssc" />
				<path
					id="rect5-1-1"
					style="display:inline;fill:#000000;stroke-width:1.88883;stroke-linejoin:round"
					d="m 94.945049,83.444341 c -14.621452,0 -26.393114,10.470481 -26.393114,23.475749 v 153.91196 c 0,13.00527 11.771662,23.47501 26.393114,23.47501 H 382.60831 c 14.62145,0 26.39228,-10.46974 26.39228,-23.47501 V 106.92009 c 0,-13.005268 -11.77083,-23.475749 -26.39228,-23.475749 z m 12.685201,17.430739 h 224.89548 c 9.30636,0 16.79839,5.78616 16.79839,12.97329 0,7.18712 -7.49203,12.97328 -16.79839,12.97328 H 107.63025 c -9.306383,0 -16.798397,-5.78616 -16.798397,-12.97328 0,-7.18713 7.492014,-12.97329 16.798397,-12.97329 z m 268.30638,0 h 0.94932 c 7.81737,0 14.11124,5.78614 14.11124,12.97329 0,7.18712 -6.29387,12.97328 -14.11124,12.97328 h -0.94932 c -7.81735,0 -14.11042,-5.78616 -14.11042,-12.97328 0,-7.18715 6.29307,-12.97329 14.11042,-12.97329 z"
					sodipodi:nodetypes="sssssssssssssssssssssss" />
				</g>
		</symbol>

		
		<!-- Merge Icons -->
		<symbol id="iconMergeUp" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons/wf_merge_up.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeDown" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons/wf_merge_down.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeLeft" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons/wf_merge_left.png" height="16" width="16" />
		</symbol>
		<symbol id="iconMergeRight" viewBox="0 0 16 16">
			<image href="../assets/img/icons/window_frame_icons/wf_merge_right.png" height="16" width="16" />
		</symbol>
	</svg>

</template>
<script setup>

// do nothing
	
</script>
<style lang="scss" scoped>

	// do nothing

</style>
