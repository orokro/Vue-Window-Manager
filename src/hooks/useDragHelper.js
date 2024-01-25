/*
	useDragHelper.js
	----------------

	Provides reference to a single instance of our DragHelper.
*/

// lib/misc
import DragHelper from 'gdraghelper';

// make one instance for now
const dragHelper = new DragHelper();

// return said instance
export default function () {
	return {
		dragHelper
	};
}
