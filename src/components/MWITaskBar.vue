<!--
	MWITaskBar.vue
	--------------

	A Windows-style task bar shown along the bottom of an MWI (floating-window) frame,
	when the mwiTaskBar setting is enabled.

	It shows:
		- an optional "start" button (when mwiStartMenu is on) that opens the add-window menu
		- one button per floating window in the frame

	Each window button reflects the window's state (focused / visible / minimized), updates
	live as the window is renamed, and on click restores (if minimized) and focuses the window.

	The task bar lives OUTSIDE the MWI pan layer, so panning the desktop never moves it.
-->
<template>

	<div class="mwiTaskBar noSel">

		<!-- optional start button -->
		<button
			v-if="windowMgr.mwiStartMenu.value == true"
			type="button"
			class="startButton"
			title="Add a window"
			@click="onStart"
		>
			<div class="startIcon"></div>
		</button>

		<!-- one button per window -->
		<div class="taskButtons">

			<button
				v-for="win in frame.windowsRef.value"
				:key="win.windowID"
				type="button"
				class="taskButton"
				:class="{
					focused: win.windowID == frame.focusedWindowID.value && win.minimized.value != true,
					minimized: win.minimized.value == true
				}"
				:title="win.titleRef.value"
				@click="onTaskButton(win)"
			>
				<!-- icon if available -->
				<div
					v-if="win.windowDetails.icon != ''"
					class="taskIcon"
					:style="{ backgroundImage: `url('${win.windowDetails.icon}')` }"
				/>

				<!-- the (live) window title -->
				<div class="taskLabel">{{ win.titleRef.value }}</div>

			</button>

		</div>

	</div>

</template>
<script setup>

// vue
import { inject } from 'vue';

// classes
import WindowFrame from '@classes/WindowFrame';

// lib/misc
import { showAddWindowMenu } from '@misc/frameMenus';

// define our props
const props = defineProps({

	// the MWI frame we represent
	frame: {
		type: WindowFrame,
		default: null
	}
});

// our window manager
const windowMgr = inject('windowManager');


/**
 * Opens the add-window ("start") menu.
 *
 * @param {Event} e - JavaScript Event Object
 */
function onStart(e){
	showAddWindowMenu(windowMgr, props.frame, e.x, e.y);
}


/**
 * Handles a click on a window's task-bar button (Windows-style):
 *   - minimized        -> restore & focus
 *   - focused & visible -> minimize (click the active button to hide it)
 *   - otherwise         -> focus / raise it
 *
 * @param {Window} win - the window the button represents
 */
function onTaskButton(win){

	// minimized -> bring it back
	if(win.minimized.value == true){
		win.restore();
		return;
	}

	// already the focused, visible window -> minimize it
	if(props.frame.focusedWindowID.value == win.windowID){
		win.minimize();
		return;
	}

	// otherwise just focus / raise it
	props.frame.focusWindow(win);
}

</script>
<style lang="scss" scoped>

	.mwiTaskBar {

		// pinned along the bottom of the MWI frame, above the windows & inner shadow.
		// (the parent .frameContents uses `isolation: isolate`, so this high z stays
		// contained within the frame and never paints over teleported context menus.)
		position: absolute;
		left: 0px;
		right: 0px;
		bottom: 0px;
		height: 30px;
		z-index: 1000;

		// lay out start button + task buttons in a row
		display: flex;
		align-items: stretch;
		gap: 4px;
		padding: 3px 4px;
		box-sizing: border-box;

		// theming
		background: var(--theme-statusBarBGColor);
		border-top: 1px solid rgba(0, 0, 0, 0.4);

		// the start button
		.startButton {

			flex: 0 0 auto;
			width: 30px;

			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: 4px;
			cursor: pointer;

			background: var(--theme-frameTabsActiveColor);

			display: flex;
			align-items: center;
			justify-content: center;

			&:hover {
				background: var(--theme-menuActiveBGColor);
			}

			.startIcon {

				// a simple 2x2 "window" glyph drawn with a border grid
				width: 14px;
				height: 14px;
				border: 2px solid var(--theme-activeTabTextColor);
				border-radius: 2px;
				position: relative;

				&::after {
					content: '';
					position: absolute;
					inset: 3px 3px 3px 3px;
					border-left: 2px solid var(--theme-activeTabTextColor);
					border-top: 2px solid var(--theme-activeTabTextColor);
				}
			}// .startIcon

		}// .startButton

		// the row of window buttons (scrolls if it overflows)
		.taskButtons {

			flex: 1 1 auto;
			display: flex;
			align-items: stretch;
			gap: 4px;
			overflow-x: auto;
			overflow-y: hidden;

			// each window's button
			.taskButton {

				flex: 0 0 auto;
				max-width: 160px;

				display: flex;
				align-items: center;
				gap: 6px;
				padding: 0px 10px;

				border: 1px solid rgba(255, 255, 255, 0.12);
				border-radius: 4px;
				cursor: pointer;

				background: var(--theme-frameTabsColor);
				color: var(--theme-tabTextColor);

				transition: background 0.12s ease, color 0.12s ease;

				&:hover {
					color: var(--theme-activeTabTextColor);
				}

				// the currently focused, visible window
				&.focused {
					background: var(--theme-frameTabsActiveColor);
					color: var(--theme-activeTabTextColor);
				}

				// minimized windows read as dimmed/italic
				&.minimized {
					opacity: 0.55;
					font-style: italic;
				}

				.taskIcon {

					flex: 0 0 auto;
					width: 18px;
					height: 18px;

					background-size: contain;
					background-repeat: no-repeat;
					background-position: center center;
				}// .taskIcon

				.taskLabel {

					// truncate long titles
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;

					font-size: 12px;
					letter-spacing: 0.3px;
				}// .taskLabel

			}// .taskButton

		}// .taskButtons

	}// .mwiTaskBar

</style>
