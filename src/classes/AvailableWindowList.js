/*
	AvailableWindowList.js
	----------------------

	A simple class to manage the list of available windows
	in the windowing system.

	We will take a list of raw Vue3 component constructors &
	turn them into a list of available windows.
*/

/**
 * AvailableWindowList class
 */
export default class AvailableWindowList {

	/**
	 * Constructor for the AvailableWindowList.
	 * 
	 * @param {Array<Function>} initialWindows - Array of Vue component constructors to initialize the list with.
	 */
	constructor(initialWindows = []) {

		// constructor -> name
		this._componentToName = new Map();
		
		// name -> constructor
		this._nameToComponent = new Map();			

		// currently available names
		this._visibleNames = new Set();

		// used for when we cannot find a suitable name for a component
		this._anonymousCounter = 0;

		// Initialize with the provided list of components
		this.setAvailableWindows(initialWindows);
	}


	/**
	 * Helper function to convert a string to PascalCase.
	 * 
	 * @param {String} str - String to convert to PascalCase.
	 * @returns {String} - The PascalCase version of the input string.
	 */
	_pascalCase(str) {
		return str
			.replace(/[-_ ]+(\w)/g, (_, c) => c.toUpperCase())
			.replace(/^\w/, c => c.toUpperCase());
	}


	/**
	 * Generates a unique name for a Vue component.
	 * 
	 * @param {Component} component - Vue component constructor to generate a name for.
	 * @returns {String} - A unique name for the component, in PascalCase.
	 */
	_generateName(component) {
		const raw =
			component.name ||
			component.__name ||
			component?.__file?.split(/[\\/]/).pop()?.replace(/\.vue$/, '');

		if (raw) return this._pascalCase(raw);
		return `AnonymousComponent`;
	}


	/**
	 * Gets or creates a unique name for a Vue component.
	 * 
	 * @param {Component} component - Vue component constructor to get or create a unique name for.
	 * @returns {String} - A unique name for the component, ensuring no name collisions.
	 */
	_getOrCreateUniqueName(component) {

		// Already registered?
		if (this._componentToName.has(component))
			return this._componentToName.get(component);

		// Start with base name
		let baseName = this._generateName(component);
		let name = baseName;
		let index = 1;

		// Make sure no name collision (name points to a *different* constructor)
		while(this._nameToComponent.has(name) && this._nameToComponent.get(name) !== component)
			name = `${baseName}${index++}`;
		
		// Register
		this._componentToName.set(component, name);
		this._nameToComponent.set(name, component);

		return name;
	}


	/**
	 * If the available list of windows changes, can update the list of available windows.
	 * 
	 * @param {Array<Component>} newWindowsArray - new list of available window Components
	 */
	setAvailableWindows(newWindowsArray) {

		this._visibleNames.clear();

		for (const component of newWindowsArray) {

			const name = this._getOrCreateUniqueName(component);
			this._visibleNames.add(name);

		}// next component
	}


	/**
	 * Gets the Vue component constructor for a window by its name.
	 * 
	 * @param {String} name - The name of the window to retrieve.
	 * @returns {Component|null} - The Vue component constructor for the window with the given name, or null if not found.
	 */
	getWindowByName(name) {
		return this._nameToComponent.get(name) || null;
	}


	/**
	 * Gets an array of all currently visible windows.
	 * 
	 * @returns {Array<Object>} - An array of objects containing the name and constructor of each visible window.
	 */
	getWindows() {
		const result = [];
		for (const name of this._visibleNames) {
			
			const component = this._nameToComponent.get(name);

			if (component)
				result.push({ name, constructor: component });
			
		}// next name

		return result;
	}

}
