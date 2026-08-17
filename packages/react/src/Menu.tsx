/*
	Menu.tsx
	--------

	A small pop-up menu: nested submenus, checkmarks, disabled and hidden items,
	keyboard navigation, click-outside and Escape to dismiss.

	Written by hand rather than pulled in. The Vue original used
	`@imengyu/vue3-context-menu`; the obvious React equivalent
	(`@radix-ui/react-dropdown-menu`) measures 30.9 kB gzipped and drags in 26
	packages, against 24.4 kB for this entire library. Paying more than the whole
	library's weight for one menu isn't a good trade, and what's needed here is
	narrow: open at a point, nest one level, dismiss.

	Menus render through a portal to <body>, because a frame clips its own overflow and
	a menu opened near a frame's edge has to escape it.
*/

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';


export interface MenuItem {

	/** Text shown for the item. Omit when `separator` is set. */
	label?: string;

	/** Optional leading visual. */
	icon?: ReactNode;

	/** Draws a tick to the left of the label. */
	checked?: boolean;

	/** Greys the item out and stops it being chosen. */
	disabled?: boolean;

	/** Leaves the item out entirely. */
	hidden?: boolean;

	/** Renders a divider instead of an item. */
	separator?: boolean;

	/** Nested items. An item with children can't also be selected. */
	children?: MenuItem[];

	/** Called when the item is chosen. */
	onSelect?: () => void;
}


interface MenuState {
	items: MenuItem[];
	x: number;
	y: number;
}


interface MenuApi {

	/**
	 * Opens a menu at a point in viewport coordinates.
	 *
	 * @param items - the menu contents
	 * @param x - viewport x
	 * @param y - viewport y
	 */
	openMenu(items: MenuItem[], x: number, y: number): void;

	/** Dismisses any open menu. */
	closeMenu(): void;
}


const MenuContext = createContext<MenuApi | null>(null);


/** Opens and closes pop-up menus. Available anywhere inside <WindowManagerView>. */
export function useMenu(): MenuApi {

	const api = useContext(MenuContext);

	if (api === null)
		throw new Error('[react-win-mgr] useMenu() must be called inside <WindowManagerView>');

	return api;
}


/**
 * Holds the single open menu for a window manager, and renders it.
 */
export function MenuProvider({ children }: { children: ReactNode }): JSX.Element {

	const [state, setState] = useState<MenuState | null>(null);

	const api = useMemo<MenuApi>(() => ({
		openMenu: (items, x, y) => setState({ items, x, y }),
		closeMenu: () => setState(null),
	}), []);

	return (
		<MenuContext.Provider value={api}>
			{children}
			{state !== null && (
				<MenuOverlay
					items={state.items}
					x={state.x}
					y={state.y}
					onClose={() => setState(null)}
				/>
			)}
		</MenuContext.Provider>
	);
}


interface MenuOverlayProps {
	items: MenuItem[];
	x: number;
	y: number;
	onClose: () => void;
}


/** One level of the open menu: its items and where it sits. */
interface MenuLevel {
	items: MenuItem[];
	x: number;
	y: number;
}


/**
 * The portal, the dismiss handling, and the stack of open panels.
 *
 * Submenus are rendered as SIBLINGS of the root panel rather than nested inside the
 * item that owns them. That looks like a detail and isn't: `.winMgrMenu` carries a
 * `backdrop-filter`, and a filtered element becomes the containing block for any
 * `position: fixed` descendant. Nest a submenu inside a panel and its "viewport"
 * coordinates are silently resolved against that panel instead - which puts it
 * hundreds of pixels off screen, visible in the DOM and invisible to the user. Keeping
 * every panel a direct child of the unfiltered layer avoids the whole class of bug.
 */
function MenuOverlay({ items, x, y, onClose }: MenuOverlayProps): JSX.Element | null {

	const rootRef = useRef<HTMLDivElement | null>(null);
	const [stack, setStack] = useState<MenuLevel[]>([{ items, x, y }]);

	// re-seed if a new menu opens at a different spot
	useEffect(() => {
		setStack([{ items, x, y }]);
	}, [items, x, y]);

	/**
	 * Opens a submenu beneath `level`, discarding anything deeper.
	 *
	 * @param level - the depth of the panel that owns the item
	 * @param subItems - the submenu's contents
	 * @param anchor - the owning item's rect, in viewport coordinates
	 */
	const openSub = useCallback((level: number, subItems: MenuItem[], anchor: DOMRect) => {
		setStack(current => [
			...current.slice(0, level + 1),
			// overlap the parent slightly so the pointer can cross without falling
			// through a gap and closing what it was heading for
			{ items: subItems, x: anchor.right - 2, y: anchor.top - 4 },
		]);
	}, []);

	/**
	 * Closes everything deeper than `level`.
	 *
	 * @param level - the depth to keep
	 */
	const closeBelow = useCallback((level: number) => {
		setStack(current => (current.length > level + 1 ? current.slice(0, level + 1) : current));
	}, []);

	useEffect(() => {

		// pointerdown rather than click: a menu should get out of the way as soon as
		// you press somewhere else, not on release
		const onPointerDown = (ev: PointerEvent): void => {
			if (rootRef.current !== null && !rootRef.current.contains(ev.target as Node))
				onClose();
		};

		const onKey = (ev: KeyboardEvent): void => {
			if (ev.key === 'Escape') {
				ev.stopPropagation();
				onClose();
			}
		};

		// capture phase, so a menu closes even over elements that stop propagation
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKey, true);
		window.addEventListener('blur', onClose);

		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
			document.removeEventListener('keydown', onKey, true);
			window.removeEventListener('blur', onClose);
		};

	}, [onClose]);

	if (typeof document === 'undefined')
		return null;

	return createPortal(
		<div className="winMgrMenuLayer" ref={rootRef}>
			{stack.map((level, index) => (
				<MenuPanel
					key={index}
					level={index}
					items={level.items}
					x={level.x}
					y={level.y}
					onClose={onClose}
					onOpenSub={openSub}
					onCloseSub={closeBelow}
					autoFocus={index === 0}
				/>
			))}
		</div>,
		document.body,
	);
}


interface MenuPanelProps {
	items: MenuItem[];
	x: number;
	y: number;
	level: number;
	onClose: () => void;
	onOpenSub: (level: number, items: MenuItem[], anchor: DOMRect) => void;
	onCloseSub: (level: number) => void;
	autoFocus?: boolean;
}


/**
 * One list of items. Submenus are raised through `onOpenSub`, not rendered here.
 */
function MenuPanel({
	items, x, y, level, onClose, onOpenSub, onCloseSub, autoFocus = false,
}: MenuPanelProps): JSX.Element {

	const panelRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
	const [pos, setPos] = useState({ x, y });
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const [activeIndex, setActiveIndex] = useState<number>(-1);

	const visible = items.filter(i => i.hidden !== true);

	// nudge back on screen once we know how big we are
	useLayoutEffect(() => {

		const el = panelRef.current;
		if (el === null)
			return;

		const rect = el.getBoundingClientRect();
		const margin = 4;

		let nextX = x;
		let nextY = y;

		// a submenu that won't fit to the right flips to the left of its parent
		if (x + rect.width > window.innerWidth - margin)
			nextX = Math.max(margin, x - rect.width);

		if (nextX + rect.width > window.innerWidth - margin)
			nextX = Math.max(margin, window.innerWidth - rect.width - margin);

		if (y + rect.height > window.innerHeight - margin)
			nextY = Math.max(margin, window.innerHeight - rect.height - margin);

		setPos({ x: nextX, y: nextY });

	}, [x, y, items]);

	useEffect(() => {
		if (autoFocus)
			panelRef.current?.focus();
	}, [autoFocus]);


	/**
	 * Runs an item, or opens its submenu.
	 *
	 * @param item - the item chosen
	 * @param index - its position in the visible list
	 */
	const choose = (item: MenuItem, index: number): void => {

		if (item.disabled === true || item.separator === true)
			return;

		if (item.children !== undefined && item.children.length > 0) {
			openSubFor(item, index);
			return;
		}

		item.onSelect?.();
		onClose();
	};


	/**
	 * Raises an item's submenu, anchored to that item's box.
	 *
	 * @param item - the owning item
	 * @param index - its position in the visible list
	 */
	const openSubFor = (item: MenuItem, index: number): void => {

		const el = itemRefs.current[index];
		if (el == null || item.children === undefined)
			return;

		setOpenIndex(index);
		onOpenSub(level, item.children, el.getBoundingClientRect());
	};


	/**
	 * Moves the highlight, skipping over anything unselectable.
	 *
	 * @param from - current index
	 * @param delta - +1 or -1
	 */
	const step = (from: number, delta: number): number => {

		let next = from;

		for (let i = 0; i < visible.length; i++) {

			next = (next + delta + visible.length) % visible.length;
			const candidate = visible[next];

			if (candidate.separator !== true && candidate.disabled !== true)
				return next;
		}

		return from;
	};


	const onKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>): void => {

		switch (ev.key) {

			case 'ArrowDown':
				ev.preventDefault();
				setActiveIndex(i => step(i, 1));
				break;

			case 'ArrowUp':
				ev.preventDefault();
				setActiveIndex(i => step(i, -1));
				break;

			case 'ArrowRight': {
				const item = visible[activeIndex];
				if (item?.children !== undefined) {
					ev.preventDefault();
					openSubFor(item, activeIndex);
				}
				break;
			}

			case 'ArrowLeft':
				ev.preventDefault();
				setOpenIndex(null);
				onCloseSub(level);
				break;

			case 'Enter':
			case ' ': {
				const item = visible[activeIndex];
				if (item !== undefined) {
					ev.preventDefault();
					choose(item, activeIndex);
				}
				break;
			}
		}
	};

	return (
		<div
			className="winMgrMenu"
			ref={panelRef}
			style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
			tabIndex={-1}
			role="menu"
			onKeyDown={onKeyDown}
		>
			{visible.map((item, index) => {

				if (item.separator === true)
					return <div className="menuSeparator" key={`sep-${index}`} />;

				const hasChildren = (item.children !== undefined && item.children.length > 0);

				return (
					<div
						key={`${item.label}-${index}`}
						ref={el => { itemRefs.current[index] = el; }}
						className={[
							'menuItem',
							item.disabled === true ? 'disabled' : '',
							activeIndex === index ? 'active' : '',
							openIndex === index ? 'open' : '',
						].filter(Boolean).join(' ')}
						role="menuitem"
						aria-disabled={item.disabled === true}
						aria-haspopup={hasChildren}
						onPointerEnter={() => {

							setActiveIndex(index);

							if (hasChildren) {
								openSubFor(item, index);
							} else {
								// moving onto a plain item abandons whatever submenu
								// the pointer came from
								setOpenIndex(null);
								onCloseSub(level);
							}
						}}
						onPointerUp={() => choose(item, index)}
					>
						<span className="menuCheck">{item.checked === true ? '✓' : ''}</span>
						{item.icon !== undefined && <span className="menuIcon">{item.icon}</span>}
						<span className="menuLabel">{item.label}</span>
						{hasChildren && <span className="menuArrow">›</span>}
					</div>
				);
			})}
		</div>
	);
}
