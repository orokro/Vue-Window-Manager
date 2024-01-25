/*
	useTextMeasuring.js
	-------------------

	Provide some methods for measuring text

	Not sure if these needs to be in a "hook" but w/e.
*/

/**
  * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
  * 
  * @param {String} text The text to be rendered.
  * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
  * 
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  */
export function getTextWidth(text, font) {

	// re-use canvas object for better performance
	const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
	const context = canvas.getContext('2d');
	context.font = font;
	const metrics = context.measureText(text);
	return metrics.width;
}

/**
 * Helper method to get the CSS value of a property on a given HTMLElement
 * 
 * @param {HTMLElement} element - element to get a CSS style value of
 * @param {String} prop - css property to check
 * @returns {String} CSS value for this property
 */
export function getCssStyle(element, prop) {
	return window.getComputedStyle(element, null).getPropertyValue(prop);
}


/**
 * Get's the font string for a given HTMLElement
 * 
 * @param {HTMLElement} el - the HTML element to get the font string for
 * @returns {String} like "bold 12pt arial"
 */
export function getCanvasFont(el = document.body) {

	// gather the individual CSS font related properties, as their computed by the browser
	const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
	const fontSize = getCssStyle(el, 'font-size') || '16px';
	const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

	// return joined font string... neat!
	return `${fontWeight} ${fontSize} ${fontFamily}`;
}
