/*
	useElementPosition.js
	---------------------

	A "hook" to track the position of an element in the DOM,
	reactively.

	It will provide the position of the element in three different contexts:
	1. Screen coordinates (relative to the viewport)
	2. Page coordinates (relative to the entire document)
	3. Container coordinates (relative to the closest positioned parent element)
	
*/

// vue
import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';


/**
 * Helper function to get the position of an element in three contexts:
 * 1. Screen coordinates (relative to the viewport)
 * 2. Page coordinates (relative to the entire document)
 * 3. Container coordinates (relative to the closest positioned parent element)
 * 
 * @param {HTMLElement} el - an element to get it's top/left (i.e. x/y) position from.
 * @returns {Object} - an object with three properties, like { screenPos, pagePos, containerPos }
 */
function getElementPositions(el) {

	// get the bounding rectangle of the element & use as screen position
	const rect = el.getBoundingClientRect();
	const screenPos = {
		x: rect.left,
		y: rect.top,
	};

	// calculate the page position by adding scroll offsets
	const pagePos = {
		x: rect.left + window.scrollX,
		y: rect.top + window.scrollY,
	};

	// find the closest positioned parent element for container position
	// if no positioned parent, use the element's parent element
	let parent = el.offsetParent || el.parentElement;
	if (!parent || parent === document.body || parent === document.documentElement) {
		parent = el.parentElement;
	}

	// get the bounding rectangle of the parent element
	let containerPos = { x: 0, y: 0 };
	if (parent instanceof Element) {
		const parentRect = parent.getBoundingClientRect();
		containerPos = {
			x: rect.left - parentRect.left,
			y: rect.top - parentRect.top,
		};
	}

	// pack up & return the positions
	return { screenPos, pagePos, containerPos };
}


/**
 * Custom Vue hook to track the position of an element reactively.
 * 
 * @param {Ref<HTMLElement>} elRef - a Vue ref to the element to track.
 * @param {boolean} withPolling - whether to use requestAnimationFrame for polling updates.
 */
export function useElementPosition(elRef, withPolling = true) {

	// reactive object to hold the positions
	const position = reactive({
		screenPos: { x: 0, y: 0 },
		pagePos: { x: 0, y: 0 },
		containerPos: { x: 0, y: 0 },
	});

	// internal variables for observers and animation frame
	let rafId = null;
	let resizeObserver = null;
	let mutationObserver = null;


	/**
	 * Utility function to check if two positions are equal
	 * 
	 * @param {Object} a - an object with x and y properties, like { x: <number>, y: <number> }
	 * @param {Object} b - another object with x and y properties, like { x: <number>, y: <number> }
	 * @returns {boolean} - true if the two positions are equal, false otherwise.
	 */
	function positionsEqual(a, b) {
		return a.x === b.x && a.y === b.y;
	}


	/**
	 * Updates our reactive position object w/ measured positions of the element we're tracking
	 */
	function updatePosition() {

		// if the element reference is not set, do nothing
		if (!elRef.value)
			return;

		// get the new positions of the element
		const newPos = getElementPositions(elRef.value);

		// check if the new positions are different from the current ones
		const hasChanged =
			!positionsEqual(newPos.screenPos, position.screenPos) ||
			!positionsEqual(newPos.pagePos, position.pagePos) ||
			!positionsEqual(newPos.containerPos, position.containerPos);
		
		// if nothing has changed, do not update the reactive object (avoids unnecessary re-renders)
		if (!hasChanged)
			return;

		// otherwise, update the reactive position object
		Object.assign(position.screenPos, newPos.screenPos);
		Object.assign(position.pagePos, newPos.pagePos);
		Object.assign(position.containerPos, newPos.containerPos);
	}

	/**
	 * Starts the observers and event listeners to track changes in the element's position.
	 * 
	 * @returns {void}
	 */
	function startObserver() {

		// if the element reference is not set, do nothing
		if (!elRef.value)
			return;

		// we'll pay attention to resize and mutation events
		resizeObserver = new ResizeObserver(updatePosition);
		resizeObserver.observe(elRef.value);

		mutationObserver = new MutationObserver(updatePosition);
		mutationObserver.observe(document.body, {
			attributes: true,
			subtree: true,
			childList: true,
			attributeFilter: ['style', 'class'],
		});

		// add event listeners for scroll and resize events
		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', updatePosition);

		// if withPolling is true, use requestAnimationFrame to poll for updates
		if (withPolling) {
			const poll = () => {
				updatePosition();
				rafId = requestAnimationFrame(poll);
			};
			rafId = requestAnimationFrame(poll);
		}
	}

	/**
	 * Cleans up the observers and event listeners to prevent memory leaks.
	 */
	function cleanup() {

		// disconnect the observers and remove event listeners
		resizeObserver?.disconnect();
		mutationObserver?.disconnect();
		window.removeEventListener('scroll', updatePosition, true);
		window.removeEventListener('resize', updatePosition);

		// cancel the animation frame if it's running
		if (rafId)
			cancelAnimationFrame(rafId);
	}

	// watch the element reference for changes
	onMounted(() => {
		watch(
			elRef,
			(el) => {
				if (el) {
					updatePosition();
					startObserver();
				}
			},
			{ immediate: true }
		);
	});

	// clean up observers and event listeners when the component is unmounted
	onBeforeUnmount(cleanup);

	// return the reactive object that will update w/ the stuff we set up here
	return position;
}
