/*
	useWindowSerialization.js
	-------------------------

	Composables a user's window-component can call (from its setup) to participate in
	layout serialization. They bind to the current window via the injected windowCtx.

	Usage inside a window component:

		import { onSerialize, onLayoutLoad } from 'vue-win-mgr';

		// return JSON-safe data to persist with the layout
		onSerialize(() => ({ imageId: currentImage.value }));

		// receive that data back when a saved layout is restored
		onLayoutLoad((saved) => { currentImage.value = saved.imageId; });

	The data returned by onSerialize() must be JSON-safe (no circular references, no
	functions, etc.) so it can live inside a serialized layout.
*/

// vue
import { inject } from 'vue';


/**
 * Registers a serialize callback for the current window.
 *
 * @param {Function} callback - returns a JSON-safe object describing this window's state
 */
export function onSerialize(callback) {

	// grab the window context provided by WindowV.vue
	const windowCtx = inject('windowCtx', null);

	// no-op (with a gentle warning) if called outside a window component
	if (windowCtx == null) {
		console.warn('[vue-win-mgr] onSerialize() must be called from inside a window component.');
		return;
	}

	windowCtx.onSerialize(callback);
}


/**
 * Registers a load callback for the current window.
 *
 * If the window was restored from a saved layout that carried rider data, the callback
 * fires immediately with that data; otherwise it simply stays registered.
 *
 * @param {Function} callback - receives the previously-saved data object
 */
export function onLayoutLoad(callback) {

	// grab the window context provided by WindowV.vue
	const windowCtx = inject('windowCtx', null);

	// no-op (with a gentle warning) if called outside a window component
	if (windowCtx == null) {
		console.warn('[vue-win-mgr] onLayoutLoad() must be called from inside a window component.');
		return;
	}

	windowCtx.onLayoutLoad(callback);
}
