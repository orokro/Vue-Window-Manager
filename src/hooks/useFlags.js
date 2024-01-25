/*
	useFlags.js
	-----------

	We'll stick some global variables aka "flags" in here
	that we can use to turn on/off various parts of the program.
*/

// vue
import { ref } from 'vue';

// set true and components will render debug details
export const useWindowingDebug = ref(true);

// set these available on the window so we can manipulate them... _live_!
window.debugFlags = {
	useWindowingDebug
};
