/*
	frameMenus.js
	-------------

	Small shared helpers for building the context-menus used by window frames.

	Right now this just provides the "add a window" menu, which is reused by both the MWI
	start-menu button and the MWI background right-click. It uses the same context-menu
	library the rest of the app uses, so the menu can render above the window manager and
	cross frame borders when space is tight.
*/

// vue
import { h } from 'vue';

// the context menu library the app already depends on
import ContextMenu from '@imengyu/vue3-context-menu';


/**
 * Shows a context menu listing every available window kind; clicking one adds it to the frame.
 *
 * @param {WindowManager} windowMgr - the window manager (source of available windows)
 * @param {WindowFrame} frame - the frame the chosen window should be added to
 * @param {Number} x - screen x position to show the menu at
 * @param {Number} y - screen y position to show the menu at
 */
export function showAddWindowMenu(windowMgr, frame, x, y) {

	ContextMenu.showContextMenu({
		x,
		y,

		// open upward like a Windows start menu (it sits at the bottom of the frame);
		// adjustPosition (on by default) still flips it down if there's no room above.
		direction: 'tr',

		theme: 'vue-win-mgr-theme',
		items: windowMgr.availableWindowList.getWindows().map(win => {
			return {
				label: win.title,
				onClick: () => {
					const newWin = windowMgr.createWindow(win.slug);
					frame.addWindow(newWin);
				},
				icon: win.icon == '' ? null : (
					h('img', {
						src: win.icon,
						style: {
							width: '20px',
							height: '20px'
						}
					})
				),
			};
		}),
	});
}
