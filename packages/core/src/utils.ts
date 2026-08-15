/*
	utils.ts
	--------

	Small helpers with nowhere better to live.

	`parseParams` / `applyKeys` from the original are gone - TypeScript's default
	parameters and object spread cover both, and they were only ever working around
	the lack of a type system.
*/


/**
 * Clamps a value between a minimum and a maximum.
 *
 * @param value - value to clamp
 * @param min - lowest allowed value
 * @param max - highest allowed value
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}


/**
 * Clamps a value into the 0..1 range.
 *
 * @param value - value to clamp
 */
export function clamp01(value: number): number {
	return clamp(value, 0, 1);
}


/** Result of comparing two 1-D ranges. */
export const RANGE_OVERLAP = {
	NO_OVERLAP: 0,
	OVERLAP: 1,
	EXACT_MATCH: 2,
} as const;

export type RangeOverlap = (typeof RANGE_OVERLAP)[keyof typeof RANGE_OVERLAP];


/**
 * Determines how the range A-B relates to the range C-D.
 *
 * This is the predicate the whole adjacency model rests on: an EXACT_MATCH between two
 * frames' perpendicular spans is what makes them mergeable, and any OVERLAP is what
 * pulls a neighbouring edge into a resize drag.
 *
 * Endpoints are inclusive, so two ranges that merely touch (B === C) count as
 * overlapping - that is deliberate and load-bearing for edge selection.
 *
 * @param a - one end of the first range
 * @param b - the other end of the first range
 * @param c - one end of the second range
 * @param d - the other end of the second range
 */
export function rangeOverlap(a: number, b: number, c: number, d: number): RangeOverlap {

	// normalise so the lower bound is always first
	const lo1 = Math.min(a, b);
	const hi1 = Math.max(a, b);
	const lo2 = Math.min(c, d);
	const hi2 = Math.max(c, d);

	// identical spans
	if (lo1 === lo2 && hi1 === hi2)
		return RANGE_OVERLAP.EXACT_MATCH;

	// disjoint in either direction
	if (hi1 < lo2 || hi2 < lo1)
		return RANGE_OVERLAP.NO_OVERLAP;

	// anything else intersects (including bare touching at a single point)
	return RANGE_OVERLAP.OVERLAP;
}


/**
 * Walks up the DOM looking for an ancestor carrying a class.
 *
 * @param el - element to start from (inclusive)
 * @param className - the class to look for
 * @returns the matching element, or null
 */
export function closestWithClass(el: Element | null, className: string): Element | null {

	let node: Element | null = el;

	while (node != null) {
		if (node.classList != null && node.classList.contains(className))
			return node;
		node = node.parentElement;
	}

	return null;
}
