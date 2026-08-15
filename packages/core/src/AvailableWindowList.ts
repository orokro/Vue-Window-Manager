/*
	AvailableWindowList.ts
	----------------------

	The registry of window kinds a manager may spawn.

	Accepts either full descriptor objects or bare component references, generating a
	slug from the component when one isn't supplied.

	This class is generic over the component type and never inspects it - the core has
	no idea what a "component" is, it just hands the value back to whichever renderer
	asked. That genericity is what lets the same core drive a React, Vue, or Svelte
	binding.
*/

import type { WindowDescriptor, WindowDescriptorInput } from './types';


export class AvailableWindowList<TComponent = unknown> {

	// component reference -> slug, so the same component always resolves to one slug
	private _componentToSlug = new Map<TComponent, string>();

	// slug -> descriptor
	private _slugToWindow = new Map<string, WindowDescriptor<TComponent>>();

	// slugs currently offered (insertion-ordered)
	private _visibleSlugs = new Set<string>();

	constructor(initial: ReadonlyArray<WindowDescriptorInput<TComponent>> = []) {
		this.setAvailableWindows(initial);
	}


	/**
	 * Replaces the set of available windows.
	 *
	 * Previously-registered slugs stay in the lookup table (windows already open keep
	 * resolving) but drop out of the visible list.
	 *
	 * @param next - the new list of descriptors or components
	 */
	setAvailableWindows(next: ReadonlyArray<WindowDescriptorInput<TComponent>>): void {

		this._visibleSlugs.clear();

		for (const entry of next) {

			let component: TComponent;
			let slug: string;
			let title: string;
			let icon: string;

			if (this._isDescriptorObject(entry)) {

				component = entry.window;
				slug = entry.slug ?? this._getOrCreateUniqueSlug(component);
				title = entry.title ?? this._pascalToTitle(slug);
				icon = entry.icon ?? '';

			} else {

				component = entry as TComponent;
				slug = this._getOrCreateUniqueSlug(component);
				title = this._pascalToTitle(slug);
				icon = '';
			}

			this._componentToSlug.set(component, slug);
			this._slugToWindow.set(slug, { window: component, title, slug, icon });
			this._visibleSlugs.add(slug);
		}
	}


	/**
	 * Looks a window kind up by slug.
	 *
	 * @param slug - the kind slug
	 * @returns the descriptor, or null if unknown
	 */
	getWindowBySlug(slug: string): WindowDescriptor<TComponent> | null {
		return this._slugToWindow.get(slug) ?? null;
	}


	/** Every currently-visible descriptor, in registration order. */
	getWindows(): WindowDescriptor<TComponent>[] {

		const out: WindowDescriptor<TComponent>[] = [];

		for (const slug of this._visibleSlugs) {
			const descriptor = this._slugToWindow.get(slug);
			if (descriptor !== undefined)
				out.push(descriptor);
		}

		return out;
	}


	/** Every currently-visible slug. */
	getWindowSlugs(): string[] {
		return [...this._visibleSlugs];
	}


	/** Alias for `getWindowSlugs`, matching the public context API's naming. */
	getAvailableWindowKinds(): string[] {
		return this.getWindowSlugs();
	}


	/**
	 * Narrows an input entry to the descriptor-object form.
	 *
	 * @param entry - the raw input
	 */
	private _isDescriptorObject(
		entry: WindowDescriptorInput<TComponent>,
	): entry is { window: TComponent } & Partial<Omit<WindowDescriptor<TComponent>, 'window'>> {

		return (
			typeof entry === 'object'
			&& entry !== null
			&& 'window' in (entry as Record<string, unknown>)
		);
	}


	/**
	 * Derives a slug from a component, falling back through the names a bundler might
	 * have left on it.
	 *
	 * @param component - the component reference
	 */
	private _generateSlug(component: TComponent): string {

		const c = component as {
			displayName?: string;
			name?: string;
			__name?: string;
			__file?: string;
		};

		const raw =
			c?.displayName
			|| c?.name
			|| c?.__name
			|| c?.__file?.split(/[\\/]/).pop()?.replace(/\.(vue|tsx?|jsx?)$/, '');

		return (raw != null && raw !== '') ? this._pascalCase(raw) : 'AnonymousComponent';
	}


	/**
	 * Returns the slug for a component, creating a unique one if needed.
	 *
	 * @param component - the component reference
	 */
	private _getOrCreateUniqueSlug(component: TComponent): string {

		const existing = this._componentToSlug.get(component);
		if (existing !== undefined)
			return existing;

		const base = this._generateSlug(component);
		let slug = base;
		let index = 1;

		// only collide-rename against a DIFFERENT component holding the slug
		while (this._slugToWindow.has(slug) && this._slugToWindow.get(slug)!.window !== component)
			slug = `${base}${index++}`;

		this._componentToSlug.set(component, slug);
		return slug;
	}


	/**
	 * Converts a string to PascalCase.
	 *
	 * @param str - input string
	 */
	private _pascalCase(str: string): string {
		return str
			.replace(/[-_ ]+(\w)/g, (_, c: string) => c.toUpperCase())
			.replace(/^\w/, c => c.toUpperCase());
	}


	/**
	 * Converts PascalCase / camelCase to spaced Title Case.
	 *
	 * @param str - input string
	 */
	private _pascalToTitle(str: string): string {
		return str
			.replace(/([A-Z])/g, ' $1')
			.replace(/^\s*/, '')
			.replace(/^\w/, c => c.toUpperCase());
	}
}
