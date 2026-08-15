/*
	signal.ts
	---------

	A very small reactivity runtime.

	The Vue version of this library kept its state in `ref()` / `shallowRef()` /
	`reactive()`, read and written through a `.value` property. That shape turned out to
	be the *only* thing tying ~4k lines of layout logic to Vue, so rather than rewrite
	every call site we reimplement just enough of it here - with no framework attached.

	What's provided:

		signal(v)        - a readable/writable box with a `.value` property
		effect(fn)       - runs fn, tracks every signal it reads, re-runs when any change
		computed(fn)     - a lazily-recomputed, cached, read-only signal
		batch(fn)        - coalesce many writes into a single notification pass
		untracked(fn)    - read signals without subscribing the current effect
		reactive(obj)    - a plain object whose properties are individually tracked

	Deliberate non-goals: no deep/recursive reactivity (the Vue original used
	`shallowRef` almost everywhere precisely to avoid it), no async scheduling beyond
	batching, no SSR concerns. Renderers subscribe via `signal.subscribe(fn)`.
*/


/** A read-only view of a signal. */
export interface ReadonlySignal<T> {

	/** Current value. Reading inside an effect subscribes that effect. */
	readonly value: T;

	/** Read the current value WITHOUT subscribing the active effect. */
	peek(): T;

	/** Subscribe to change notifications. Returns an unsubscribe function. */
	subscribe(fn: () => void): () => void;
}


/** Internal: anything that wants to be told when a signal it read has changed. */
interface Reaction {
	_run(): void;
	_deps: Set<SignalImpl<unknown>>;
}


// the effect currently being tracked, if any
let activeReaction: Reaction | null = null;

// batching state - while depth > 0 we queue reactions instead of running them
let batchDepth = 0;
const pending = new Set<Reaction>();


/**
 * Queues (or immediately runs) a reaction, respecting the current batch depth.
 *
 * @param r - the reaction to schedule
 */
function schedule(r: Reaction): void {

	if (batchDepth > 0) {
		pending.add(r);
		return;
	}
	r._run();
}


/**
 * Flushes every reaction queued during a batch.
 *
 * Reactions may themselves write to signals, so we drain the queue in a loop rather
 * than iterating it once.
 */
function flush(): void {

	// guard against a pathological effect that keeps re-dirtying itself
	let guard = 0;

	while (pending.size > 0) {

		if (++guard > 1000)
			throw new Error('[win-mgr] reactivity flush did not settle after 1000 passes (cyclic effect?)');

		const batchOfReactions = [...pending];
		pending.clear();
		for (const r of batchOfReactions)
			r._run();
	}
}


/** The concrete signal. Not exported directly - use `signal()`. */
class SignalImpl<T> implements ReadonlySignal<T> {

	private _value: T;

	// reactions that read us & want to re-run when we change
	private _reactions = new Set<Reaction>();

	// plain callbacks (renderers) that just want a ping
	private _listeners = new Set<() => void>();

	constructor(initial: T) {
		this._value = initial;
	}

	get value(): T {

		// if we're being read inside an effect, record the dependency both ways
		if (activeReaction !== null) {
			this._reactions.add(activeReaction);
			activeReaction._deps.add(this as SignalImpl<unknown>);
		}

		return this._value;
	}

	set value(next: T) {

		// no-op on an identical write; this is what keeps drag loops from thrashing
		if (Object.is(next, this._value))
			return;

		this._value = next;
		this.notify();
	}

	/** Reads without subscribing. */
	peek(): T {
		return this._value;
	}

	/**
	 * Force a notification without changing the value.
	 *
	 * Needed when a value is mutated in place (the layout code does this with the
	 * `preferredPos` object) rather than replaced.
	 */
	notify(): void {

		for (const r of [...this._reactions])
			schedule(r);

		for (const l of [...this._listeners])
			l();
	}

	subscribe(fn: () => void): () => void {
		this._listeners.add(fn);
		return () => { this._listeners.delete(fn); };
	}

	/** Internal: drop a reaction that is being disposed or re-tracked. */
	_removeReaction(r: Reaction): void {
		this._reactions.delete(r);
	}
}


/** A writable signal. */
export type Signal<T> = SignalImpl<T>;


/**
 * Creates a new signal.
 *
 * @param initial - the starting value
 * @returns a signal with a read/write `.value`
 */
export function signal<T>(initial: T): Signal<T> {
	return new SignalImpl<T>(initial);
}


/**
 * Runs `fn` immediately, tracking every signal it reads, and re-runs it whenever any
 * of those signals change.
 *
 * @param fn - the reactive computation
 * @returns a dispose function that stops the effect and releases its subscriptions
 */
export function effect(fn: () => void): () => void {

	let disposed = false;

	const reaction: Reaction = {

		_deps: new Set<SignalImpl<unknown>>(),

		_run() {

			if (disposed)
				return;

			// drop old dependencies - the set of signals read can change between runs
			for (const dep of reaction._deps)
				dep._removeReaction(reaction);
			reaction._deps.clear();

			const previous = activeReaction;
			activeReaction = reaction;

			try {
				fn();
			} finally {
				activeReaction = previous;
			}
		},
	};

	reaction._run();

	return () => {
		disposed = true;
		for (const dep of reaction._deps)
			dep._removeReaction(reaction);
		reaction._deps.clear();
		pending.delete(reaction);
	};
}


/**
 * A cached, lazily-recomputed derived value.
 *
 * @param compute - function deriving the value from other signals
 * @returns a read-only signal
 */
export function computed<T>(compute: () => T): ReadonlySignal<T> {

	const out = new SignalImpl<T>(undefined as T);
	let primed = false;

	// keep it up to date eagerly; these graphs are tiny and it keeps the code honest
	effect(() => {
		const next = compute();
		if (!primed) {
			primed = true;
			(out as unknown as { _value: T })._value = next;
			return;
		}
		out.value = next;
	});

	return out;
}


/**
 * Groups multiple signal writes so dependents are notified once, at the end.
 *
 * @param fn - the work to batch
 * @returns whatever `fn` returned
 */
export function batch<T>(fn: () => T): T {

	batchDepth++;

	try {
		return fn();
	} finally {
		batchDepth--;
		if (batchDepth === 0)
			flush();
	}
}


/**
 * Reads signals without subscribing the currently-running effect.
 *
 * @param fn - the work to run untracked
 * @returns whatever `fn` returned
 */
export function untracked<T>(fn: () => T): T {

	const previous = activeReaction;
	activeReaction = null;

	try {
		return fn();
	} finally {
		activeReaction = previous;
	}
}


/**
 * Wraps a plain object so each of its own properties is individually tracked.
 *
 * Replaces Vue's `reactive()` for the few small fixed-shape objects the layout code
 * mutates in place (edge neighbour status, MWI window position/size). Only keys
 * present at creation time are reactive - these objects never grow.
 *
 * @param source - a plain object of primitives
 * @returns a proxy with the same shape, backed by one signal per key
 */
export function reactive<T extends object>(source: T): T {

	const signals = new Map<string | symbol, Signal<unknown>>();

	for (const [key, value] of Object.entries(source))
		signals.set(key, signal(value));

	return new Proxy(source, {

		get(target, prop, receiver) {
			const s = signals.get(prop);
			return (s !== undefined) ? s.value : Reflect.get(target, prop, receiver);
		},

		set(target, prop, next, receiver) {
			const s = signals.get(prop);
			if (s !== undefined) {
				s.value = next;
				return true;
			}
			return Reflect.set(target, prop, next, receiver);
		},
	}) as T;
}
