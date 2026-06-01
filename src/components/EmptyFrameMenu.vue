<!--
	EmptyFrameMenu.vue
	------------------

	The "start menu" / empty-state UI shown inside a non-MWI WindowFrame that currently
	has no windows in it.

	It serves two purposes:
		- a picker grid of all available window kinds (icon + name), click to fill the frame
		- optional merge-arrow buttons (when showMergeButtons is enabled) along each edge that
		  has a valid adjacent neighbor, so the user can collapse the empty frame away

	This only appears for TABBED/SINGLE frames - empty MWI desktops are valid and use their
	own task bar / start menu instead.
-->
<template>

	<div class="emptyFrameMenu noSel">

		<!-- the picker grid of available window kinds -->
		<div class="pickerWrap">

			<div class="pickerHint">Add a window</div>

			<div class="pickerGrid">

				<button
					v-for="win in availableWindows"
					:key="win.slug"
					type="button"
					class="pickerItem"
					:title="win.title"
					@click="addWindow(win.slug)"
				>
					<!-- icon if we have one, otherwise a generic placeholder -->
					<div
						v-if="win.icon != ''"
						class="pickerIcon"
						:style="{ backgroundImage: `url('${win.icon}')` }"
					/>
					<div v-else class="pickerIcon generic"></div>

					<!-- the window name -->
					<div class="pickerLabel">{{ win.title }}</div>

				</button>

			</div>
		</div>

		<!-- optional merge-arrow buttons on valid edges -->
		<template v-if="windowMgr.showMergeButtons.value == true">

			<button
				v-if="canMerge(E.LEFT)"
				type="button"
				class="mergeBtn left"
				title="Merge neighbor over this empty frame"
				@click="mergeAway(E.LEFT)"
			>&#9654;</button>

			<button
				v-if="canMerge(E.RIGHT)"
				type="button"
				class="mergeBtn right"
				title="Merge neighbor over this empty frame"
				@click="mergeAway(E.RIGHT)"
			>&#9664;</button>

			<button
				v-if="canMerge(E.TOP)"
				type="button"
				class="mergeBtn top"
				title="Merge neighbor over this empty frame"
				@click="mergeAway(E.TOP)"
			>&#9660;</button>

			<button
				v-if="canMerge(E.BOTTOM)"
				type="button"
				class="mergeBtn bottom"
				title="Merge neighbor over this empty frame"
				@click="mergeAway(E.BOTTOM)"
			>&#9650;</button>

		</template>

	</div>

</template>
<script setup>

// vue
import { inject, computed } from 'vue';

// classes
import WindowFrame from '@classes/WindowFrame';

// define our props
const props = defineProps({

	// the (empty) window frame we represent
	frame: {
		type: WindowFrame,
		default: null
	}
});

// our window manager
const windowMgr = inject('windowManager');

// shorthand for the edge constants in the template
const E = WindowFrame.EDGE;

// the list of available window kinds to offer in the picker grid
const availableWindows = computed(() => windowMgr.availableWindowList.getWindows());


/**
 * Adds a fresh window of the given kind to this frame.
 *
 * @param {String} slug - the slug of the window kind to add
 */
function addWindow(slug){

	const newWin = windowMgr.createWindow(slug);
	props.frame.addWindow(newWin);
}


/**
 * Whether this frame can be merged with the neighbor on the given edge.
 *
 * @param {String} edge - one of the WindowFrame.EDGE constants
 * @returns {Boolean} - true if there's a perfectly-adjacent neighbor on that edge
 */
function canMerge(edge){
	return props.frame.neighborStatus[edge] == WindowFrame.EDGE_NEIGHBOR_STATUS.ADJACENT;
}


/**
 * Collapses this empty frame by expanding the neighbor on the given edge over it.
 *
 * @param {String} edge - the edge whose neighbor should absorb this empty frame
 */
function mergeAway(edge){

	// guard: only if we actually have an adjacent neighbor there
	if(canMerge(edge) == false)
		return;

	// keep the neighbor & merge across its opposite edge (which is us), removing this frame
	const neighbor = props.frame.neighbors[edge];
	windowMgr.mergeWindowFrames(neighbor, WindowFrame.getOppositeEdge(edge));
}

</script>
<style lang="scss" scoped>

	.emptyFrameMenu {

		// fill the frame content area (below the ~25px header strip)
		position: absolute;
		inset: 25px 0px 0px 0px;

		// center the picker
		display: flex;
		align-items: center;
		justify-content: center;

		// subtle backdrop so it reads as "empty"
		background: var(--theme-frameBGColor);

		// the wrapper around the grid
		.pickerWrap {

			max-width: 90%;
			max-height: 90%;
			overflow: auto;
			text-align: center;

			.pickerHint {
				margin-bottom: 10px;
				font-size: 13px;
				letter-spacing: 0.5px;
				color: var(--theme-windowTitleTextColor);
				opacity: 0.8;
			}

			// responsive grid of window kinds
			.pickerGrid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
				gap: 8px;
				justify-content: center;
			}

			// each pickable window kind
			.pickerItem {

				// reset button styles
				border: 1px solid rgba(255, 255, 255, 0.12);
				border-radius: 6px;
				cursor: pointer;

				// layout
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 6px;
				padding: 10px 6px;

				// theming
				background: var(--theme-frameTabsColor);
				color: var(--theme-tabTextColor);

				transition: background 0.12s ease, color 0.12s ease;

				&:hover {
					background: var(--theme-frameTabsActiveColor);
					color: var(--theme-activeTabTextColor);
				}

				.pickerIcon {

					width: 32px;
					height: 32px;

					background-size: contain;
					background-repeat: no-repeat;
					background-position: center center;

					// generic fallback icon (a simple framed square)
					&.generic {
						border: 2px solid currentColor;
						border-radius: 4px;
						opacity: 0.5;
					}
				}// .pickerIcon

				.pickerLabel {
					font-size: 12px;
					line-height: 1.1;
					word-break: break-word;
				}// .pickerLabel

			}// .pickerItem

		}// .pickerWrap

		// the merge-arrow buttons
		.mergeBtn {

			position: absolute;
			z-index: 5;

			// fixed circular-ish button
			width: 30px;
			height: 30px;
			padding: 0px;

			border: 1px solid rgba(255, 255, 255, 0.25);
			border-radius: 6px;
			cursor: pointer;

			background: var(--theme-frameTabsActiveColor);
			color: var(--theme-activeTabTextColor);

			font-size: 13px;
			line-height: 1;

			&:hover {
				background: var(--theme-menuActiveBGColor);
				color: var(--theme-menuActiveTextColor);
			}

			// position each button on its edge, centered along it
			&.left {
				left: 8px;
				top: 50%;
				transform: translateY(-50%);
			}
			&.right {
				right: 8px;
				top: 50%;
				transform: translateY(-50%);
			}
			&.top {
				top: 8px;
				left: 50%;
				transform: translateX(-50%);
			}
			&.bottom {
				bottom: 8px;
				left: 50%;
				transform: translateX(-50%);
			}

		}// .mergeBtn

	}// .emptyFrameMenu

</style>
