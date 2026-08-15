/*
	theme.ts
	--------

	Theme values, published as CSS custom properties on the manager's root element.

	Everything the stylesheet paints reads from a `--theme-*` variable, so a theme
	change is a style-object swap rather than a re-render of anything - and consumers
	can override individual variables from their own CSS if they'd rather not pass a
	prop.
*/

export const defaultThemeColors = {

	// backgrounds
	systemBGColor: '#000',
	topBarBGColor: '#31313B',
	statusBarBGColor: '#31313B',
	frameBGColor: '#737378',
	windowBGColor: '#EFEFEF',
	mwiBGColor: '#39393E',
	menuBGColor: 'rgba(0, 0, 0, 0.7)',
	menuActiveBGColor: 'rgba(255, 255, 255, 0.8)',

	// frame headers & tabs
	frameHeaderColor: '#5C5C60',
	frameTabsHeaderColor: '#2E2E30',
	frameTabsColor: '#4A4A4E',
	frameTabsActiveColor: '#737378',

	// text
	windowTitleTextColor: 'rgb(209, 209, 209)',
	tabTextColor: 'rgb(150, 149, 149)',
	activeTabTextColor: 'rgb(209, 209, 209)',
	menuTextColor: '#EFEFEF',
	menuActiveTextColor: '#000',
	menuDisabledTextColor: '#999',

	menuBlur: '2px',

	// hamburger
	hamburgerIconColor: 'rgba(255, 255, 255, 0.5)',
	hamburgerIconColorHover: '#FFF',
	hamburgerCircleColor: 'none',
	hamburgerCircleColorHover: 'rgba(255, 255, 255, 0.25)',

	// close buttons
	closeButtonCircle: 'none',
	closeButtonCircleHover: 'rgba(255, 0, 0, 0.3)',
	closeButtonXColor: 'rgba(0, 0, 0, 0.5)',
	closeButtonXColorHover: 'rgba(255, 255, 255, 1)',

	// resize handles
	handleHoverColor: 'rgba(255, 255, 255, 0.35)',
	handleActiveColor: 'rgba(120, 190, 255, 0.9)',
};


export type ThemeColors = typeof defaultThemeColors;
export type ThemeOverrides = Partial<ThemeColors>;


/**
 * Turns a theme into the inline style object that publishes it.
 *
 * @param overrides - values replacing the defaults
 * @returns a style object of `--theme-*` custom properties
 */
export function themeToCssVars(overrides: ThemeOverrides = {}): Record<string, string> {

	const out: Record<string, string> = {};

	for (const key of Object.keys(defaultThemeColors) as Array<keyof ThemeColors>)
		out[`--theme-${key}`] = overrides[key] ?? defaultThemeColors[key];

	return out;
}
