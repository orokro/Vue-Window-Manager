/*
	useWindowManagement.js
	----------------------

	This will be the main file for including our Windowing system
	logic into components.

	Primarily, into the WindowingSystem.vue component and it's friends.

	Notes on how the window management system is designed.

	I want the Windowing system to behave like Blender first-and-foremost:
		- Windows can be split horizontally and vertically
		- Neighboring windows can be merged horizontal/vertically on edges they share
		- There's an icon on the top-left of the window that can "switch" what is rendered there.

	But, after thinking about it, and how other applications work (like Photoshop, Unity, QT applications, etc)
	it would be nice to also be able to drag-and-drop windows to snap them in place.

	This is a paradigm that people are already familiar with, so would be nice to have that.

	Of course, that implies window regions can have tabbed windows.

	So, we will have two modes - default, which is blender, but also "tab mode"
	which allows each window region to be tabbed full of multiple windows.

	Now just for fun, I also want to be able to have "free floating" windows, a-la
	classic Windows MDI style, or perhaps Fruity-loops style.

	To accomplish this, I will add a special tab called "Window Space" which will
	allow multiple windows to be placed free/floating and minimized/maximized.

*/

// classes
import WindowManager from './classes/WindowManager';

// make a new window manager if one doesn't exist yet
const windowMgr = new WindowManager();

// just export the instance of our window manager
export default function () {
	return {
		windowMgr
	};
}
