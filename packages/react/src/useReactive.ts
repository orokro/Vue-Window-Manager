/*
	useReactive.ts
	--------------

	The bridge between the core's signals and React rendering.

	`useSyncExternalStore` is exactly the right primitive here: the window manager IS an
	external store, it just happens to be one made of fine-grained signals rather than a
	single blob. We wrap a compute function in a core `effect`, so a component
	subscribes to precisely the signals it read - not to "the manager changed".

	One rule for callers: the compute function must return a primitive or a stable
	reference. Returning a freshly-built object or array on every call makes the
	snapshot look permanently changed and React will loop. The core deliberately hands
	out stable arrays (`framesRef`, `windowsRef` are replaced, never mutated), so in
	practice this is easy to honour.
*/

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { effect, untracked, type ReadonlySignal } from '@win-mgr/core';


/**
 * Subscribes a component to whatever signals `compute` reads.
 *
 * @param compute - derives a value from core signals
 * @returns the current value, re-rendering when its dependencies change
 */
export function useReactive<T>(compute: () => T): T {

	// keep the latest closure without making `subscribe` unstable
	const computeRef = useRef(compute);
	computeRef.current = compute;

	const cache = useRef<{ primed: boolean; value: T }>({ primed: false, value: undefined as T });

	const subscribe = useCallback((onStoreChange: () => void) => {

		return effect(() => {

			const next = computeRef.current();
			const changed = !cache.current.primed || !Object.is(next, cache.current.value);

			cache.current = { primed: true, value: next };

			// the effect's first run happens synchronously inside subscribe; only tell
			// React about it if the value actually differs from what it already read
			if (changed)
				onStoreChange();
		});
	}, []);

	const getSnapshot = useCallback(() => {

		if (!cache.current.primed)
			cache.current = { primed: true, value: untracked(() => computeRef.current()) };

		return cache.current.value;
	}, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}


/**
 * Subscribes a component to a single signal.
 *
 * @param sig - the signal to read
 * @returns its current value
 */
export function useSignal<T>(sig: ReadonlySignal<T>): T {
	return useReactive(() => sig.value);
}
