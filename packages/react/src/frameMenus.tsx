/*
	frameMenus.tsx
	--------------

	Builds the contents of a frame's hamburger menu.

	Kept apart from the components so the menu can be raised from anywhere that has a
	frame in hand - the hamburger today, a right-click on a frame edge later - without
	either of those places knowing how the menu is put together.
*/

import { EDGE, FRAME_STYLE, SPLIT_MODE, type FrameStyle } from '@win-mgr/core';
import type { ReactWindowFrame, ReactWindowManager } from './context';
import type { MenuItem } from './Menu';


/**
 * The label for the "add a window" entry, which reads differently per mode.
 *
 * @param style - the frame's current style
 */
function addLabelFor(style: FrameStyle): string {

	if (style === FRAME_STYLE.SINGLE)
		return 'Switch View';

	if (style === FRAME_STYLE.MWI)
		return 'Add Window';

	return 'Add Tab';
}


/**
 * Assembles the hamburger menu for a frame.
 *
 * @param mgr - the window manager
 * @param frame - the frame the menu belongs to
 * @returns menu items ready to hand to `openMenu`
 */
export function buildFrameMenu(mgr: ReactWindowManager, frame: ReactWindowFrame): MenuItem[] {

	const style = frame.frameStyle.peek();
	const splitable = mgr.canSplit(frame);

	const addWindow = (slug: string): void => {
		frame.addWindow(mgr.createWindow(slug));
	};

	const mergeItem = (label: string, edge: typeof EDGE[keyof typeof EDGE]): MenuItem => ({
		label,
		disabled: !mgr.canMerge(frame, edge),
		onSelect: () => mgr.mergeWindowFrames(frame, edge),
	});

	return [
		{
			label: addLabelFor(style),
			children: mgr.availableWindowList.getWindows().map(descriptor => ({
				label: descriptor.title,
				icon: (descriptor.icon !== '')
					? <img src={descriptor.icon} width={20} height={20} alt="" />
					: undefined,
				onSelect: () => addWindow(descriptor.slug),
			})),
		},
		{
			label: 'Frame Mode',
			children: [
				{
					label: 'Tabbed',
					checked: style === FRAME_STYLE.TABBED,
					onSelect: () => frame.setFrameStyle(FRAME_STYLE.TABBED),
				},
				{
					label: 'Single Window',
					checked: style === FRAME_STYLE.SINGLE,
					onSelect: () => frame.setFrameStyle(FRAME_STYLE.SINGLE),
				},
				{
					label: 'Floating Windows',
					checked: style === FRAME_STYLE.MWI,
					onSelect: () => frame.setFrameStyle(FRAME_STYLE.MWI),
				},
			],
		},
		{ separator: true },
		{
			label: 'Split Frame',
			disabled: splitable.neither,
			children: [
				{
					label: 'Vertically',
					disabled: !splitable.v,
					onSelect: () => mgr.startFrameSplit(frame, SPLIT_MODE.VERTICAL),
				},
				{
					label: 'Horizontally',
					disabled: !splitable.h,
					onSelect: () => mgr.startFrameSplit(frame, SPLIT_MODE.HORIZONTAL),
				},
			],
		},
		{
			label: 'Merge Frame',
			disabled: !mgr.canMerge(frame),
			children: [
				mergeItem('Merge Left', EDGE.LEFT),
				mergeItem('Merge Right', EDGE.RIGHT),
				mergeItem('Merge Up', EDGE.TOP),
				mergeItem('Merge Down', EDGE.BOTTOM),
			],
		},
		{ separator: true },
		{
			label: 'Close All Windows',
			disabled: frame.windows.length === 0,
			onSelect: () => frame.closeAllWindows(),
		},
	];
}
