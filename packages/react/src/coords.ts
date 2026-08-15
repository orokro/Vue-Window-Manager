/*
	coords.ts
	---------

	Converting client (viewport) coordinates into the space the core thinks in.

	Frames are positioned from `frame.screenPos`, whose origin is the top-left of the
	frame container's PADDING box - because that's where an absolutely positioned child
	starts. `getBoundingClientRect()` returns the BORDER box, and the container has a
	border, so subtracting the rect alone leaves you a couple of pixels out. Small
	enough to look like it works, big enough to make hit testing wrong near edges.

	`clientLeft` / `clientTop` are exactly the border widths, so they close the gap.
*/

export interface ContainerPoint {
	x: number;
	y: number;
}


/**
 * Converts a viewport coordinate into frame-container space.
 *
 * @param container - the frame container element
 * @param clientX - viewport x
 * @param clientY - viewport y
 */
export function toContainerPoint(container: HTMLElement, clientX: number, clientY: number): ContainerPoint {

	const rect = container.getBoundingClientRect();

	return {
		x: clientX - rect.left - container.clientLeft,
		y: clientY - rect.top - container.clientTop,
	};
}
