/*
	AvailableWindowList.js
	----------------------

	A simple class to manage the list of available windows
	in the windowing system.

	Supports either a list of Vue3 component constructors or

a list of metadata objects describing the windows.
*/

/**
 * AvailableWindowList class
 */
export default class AvailableWindowList {

	/**
	 * Constructor for the AvailableWindowList.
	 * 
	 * @param {Array<Function|Object>} initialWindows - Array of Vue component constructors or window descriptor objects.
	 */
	constructor(initialWindows = []) {

		// component -> slug
		this._componentToSlug = new Map();

		// slug -> full window object { window, title, slug, icon }
		this._slugToWindow = new Map();

		// currently visible slugs
		this._visibleSlugs = new Set();

		// for fallback slugs
		this._anonymousCounter = 0;

		// Initialize with the provided list
		this.setAvailableWindows(initialWindows);
	}


	/**
	 * Helper function to convert a string to PascalCase.
	 * 
	 * @param {String} str - String to convert.
	 * @returns {String}
	 */
	_pascalCase(str) {
		return str
			.replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
			.replace(/^\w/, c => c.toUpperCase());
	}


	/**
	 * Converts PascalCase or camelCase into spaced Title Case.
	 * 
	 * @param {String} str - String to convert.
	 * @returns {String}
	 */
	_pascalToTitle(str) {
		return str
			.replace(/([A-Z])/g, ' $1')
			.replace(/^\s*/, '')
			.replace(/^\w/, c => c.toUpperCase());
	}


	/**
	 * Generates a slug for a Vue component.
	 * 
	 * @param {Component} component - Vue component constructor.
	 * @returns {String} - A unique slug.
	 */
	_generateSlug(component) {
		const raw =
			component.name ||
			component.__name ||
			component?.__file?.split(/[\\/]/).pop()?.replace(/\.vue$/, '');

		if (raw) return this._pascalCase(raw);
		return `AnonymousComponent`;
	}


	/**
	 * Gets or creates a unique slug for a Vue component.
	 * 
	 * @param {Component} component - Vue component constructor.
	 * @returns {String} - A unique slug.
	 */
	_getOrCreateUniqueSlug(component) {
		if (this._componentToSlug.has(component))
			return this._componentToSlug.get(component);

		let baseSlug = this._generateSlug(component);
		let slug = baseSlug;
		let index = 1;

		while(this._slugToWindow.has(slug) && this._slugToWindow.get(slug).window !== component)
			slug = `${baseSlug}${index++}`;

		this._componentToSlug.set(component, slug);
		return slug;
	}


	/**
	 * Sets the list of available windows.
	 * 
	 * @param {Array<Function|Object>} newWindowsArray - New list of windows.
	 */
	setAvailableWindows(newWindowsArray) {
		this._visibleSlugs.clear();

		for (const entry of newWindowsArray) {
			let window, title, slug, icon;

			if (typeof entry === 'object' && entry.window) {
				window = entry.window;
				slug = entry.slug || this._getOrCreateUniqueSlug(window);
				title = entry.title || this._pascalToTitle(slug);
				icon = entry.icon || "";

			} else {
				window = entry;
				slug = this._getOrCreateUniqueSlug(window);
				title = this._pascalToTitle(slug);
				icon = "";
			}

			const windowObj = { window, title, slug, icon };

			this._componentToSlug.set(window, slug);
			this._slugToWindow.set(slug, windowObj);
			this._visibleSlugs.add(slug);
		}// next entry
	}


	/**
	 * Gets a window descriptor by its slug.
	 * 
	 * @param {String} slug - The slug to look up.
	 * @returns {Object|null} - Full window descriptor object or null.
	 */
	getWindowBySlug(slug) {
		return this._slugToWindow.get(slug) || null;
	}


	/**
	 * Returns an array of all currently visible window descriptor objects.
	 * 
	 * @returns {Array<Object>} - List of window descriptor objects.
	 */
	getWindows() {
		const result = [];
		for (const slug of this._visibleSlugs) {
			const windowObj = this._slugToWindow.get(slug);
			if (windowObj) result.push(windowObj);
		}// next slug
		return result;
	}


	/**
	 * Helper to get a list of our window slugs.
	 * 
	 * @returns {Array<String>} - An array of slugs for currently visible windows.
	 */
	getWindowSlugs(){
		return Array.from(this._visibleSlugs);
	}
	
	
	/**
	 * Alias for getWindowSlugs, perhaps more memorable.
	 * 
	 * @returns {Array<String>} - An array of slugs for currently available windows.
	 */
	getAvailableWindowKinds(){
		return this.getWindowSlugs()
	}

}
