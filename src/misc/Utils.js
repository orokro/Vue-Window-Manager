/*
	Utils.js
	--------

	IDK, this file provides exports for miscellaneous functions
	and useful stuff that would be homeless otherwise.
*/


/**
 * Parses the optional parameter object, if one was provided
 * 
 * @param {null|Object} params - the optional param object, or null if doesn't exist
 * @param {Object} defaults - the defaults to replace missing params with
 * @return {Object} proper params object adjusted for optional fields
*/
export function parseParams(params, defaults) {

	// return if null or undefined
	if ((typeof (params) === 'undefined'))
		return defaults;
	if (params == null)
		return defaults;

	// handle optional keys
	var keys = Object.entries(defaults);
	for (var i = 0; i < keys.length; i++) {

		var key = keys[i][0];
		params[key] = (!(typeof (params[key]) === 'undefined')) ? params[key] : defaults[key];
	}// next i

	return params;
}


/**
 * Helper method to apply some values of one object, to another...
 * 
 * .. given a list of keys to copy specifically.
 * 
 * @param {Object} targetObject - a JavaScript object to copy values to
 * @param {Object} fromObject - a JavaScript object to copy values from
 * @param {Array<String>} keys - array of keys to copy
 */
export function applyKeys(targetObject, fromObject, keys) {

	// loop over the list of keys and copy them from one object to the other
	for (let i = 0; i < keys.length; i++) {

		// get key to use on both objects
		const key = keys[i];

		// copy no matter what
		targetObject[key] = fromObject[key];

	}// next i
}


/**
 * Simple helper function to log whatever is passed into it & return that thing, for debugging component props
 * @param {Any} a - something to log 
 */
export function a(a) {
	console.log('a', a);
	return a;
}


/**
 * Helper function cuz the min(max(...), ...) thing is confusing everything I write it
 * 
 * @param {number} value - value to clamp
 * @param {number} min - min value allowed
 * @param {number} max - max value allowed
 * @returns {number} - clamped between min & max
 */
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}


/**
 * Helper method useful for tweens, lerps, etc
 * 
 * @param {number} value - number to clamp between 0.0f and 1.0f
 * @returns {number} clamped between 0.0f and 1.0f
 */
export function clamp01(value) {
	return clamp(value, 0, 1);
}


/**
 * Determines if range A-B overlaps in anyway with range C-D...
 * 
 * ... this includes if they casually overlap, or
 * if one range entirely engulfs the entire other range
 * @param {Number} A - position 1 on range A-B
 * @param {Number} B - position 2 on range A-B
 * @param {Number} C - position 1 on range C-D
 * @param {Number} D - position 2 on range C-D
 * @returns {Number} - 0: no overlap, 1: some overlap, 2: exact match
 */
export function rangeOverlap(A, B, C, D) {

	/*
		NOTE: I'm aware this is ugly.
		I'm sure there's some fancy mathematical way to do this.
		
		Thanks. Right now: IDC. My goal is to get a boolean from overlapping ranges.

		Perhaps in the future this could be replaced with a mathematically pure function,
		that doesn't have sloppy redundancy like this one.

		Sure.

		At the time of writing, however, this method is not a priority and simply needs to exist.
	*/

	// for sanity check, we'll make sure the ranges are always ordered such that a is the lower value
	if (A > B) {
		let t = B;
		B = A;
		A = t;
	}
	if (C > D) {
		let t = D;
		D = C;
		C = t;
	}

	// situation:
	//    A----B
	//    C----D
	if (A == C && B == D)
		return rangeOverlap.RESULT.EXACT_MATCH;

	// situation:
	// A---B
	//         C---D
	if (A < C && B < C)
		return rangeOverlap.RESULT.NO_OVERLAP;

	// situation:
	//         A---B
	// C---D
	if (A > D && B > D)
		return rangeOverlap.RESULT.NO_OVERLAP;

	// situations:
	// A----------B  |  A------B  |  A------B  |     A-----B  |  A----B      |  A---B
	//     C---D     |  C--D      |      C--D  |   C---D      |     C----D   |  C---D
	if ((C >= A && C <= B) || (D >= A && D <= B))
		return rangeOverlap.RESULT.OVERLAP;

	// situations:
	//     A---B     |  A--B      |      A--B  |   A---B      |     A----B   |  A---B
	// C----------D  |  C------D  |  C------D  |     C-----D  |  C----D      |  C---D
	if ((A >= C && A <= D) || (B >= C && B <= D))
		return rangeOverlap.RESULT.OVERLAP;

	// situations:
	// A--B	   |  A--B   |     A--B  |    A--B
	//    C--D |  C----D |  C--D     |  C----D
	if (A == C || A == D || B == C || B == D)
		return rangeOverlap.RESULT.OVERLAP;

	// no overlap of any kind, I suppose
	return rangeOverlap.RESULT.NO_OVERLAP;
}

/**
* look up the DOM hierarchy looking for a class.

* @param {HTMLElement} el - element to start looking upward from
* @param {String} className - the class to look for
* @return {Boolean|HTMLElement} false if nothing found, the dom element if found 
*/
export function checkParentsForClass(el, className) {

	// endless loop to break out of when we run out of parents or find what we're looking for
	while (true) {

		// check if this element has a class and return if so
		const classList = el.classList;
		if (classList !== undefined && el.classList.contains(className))
			return el;

		// // otherwise set parent and continue
		// $el = $el.parent();
		el = el.parentNode;

		// if it's null, we hit the top of the DOM tree, so we can GTFO
		if (el == null)
			return false;

	}// wend

}// static checkParentsForClass(el, className)


rangeOverlap.RESULT = {
	NO_OVERLAP: 0,
	OVERLAP: 1,
	EXACT_MATCH: 2,
};
