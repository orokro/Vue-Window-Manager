# vue-window-manager

This provides a Blender / QT / Unity, etc like Window Manager.

## [HOMEPAGE - https://orokro.github.io/Vue-Window-Manager/](https://orokro.github.io/Vue-Window-Manager/)


## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

# ▶️ TUTORIAL

[![ThreeQuery Full Tutorial!
](https://img.youtube.com/vi/h8QUzUtAqDI/0.jpg)](https://www.youtube.com/watch?v=h8QUzUtAqDI)

# 🎛️ DOCS

> A powerful, highly customizable, Vue 3-based window manager for building creative, Blender-like, QT-style applications with floating, dockable, tabbed, and split-window interfaces.

---

## 📚 Table of Contents

- 🚀 Introduction
- 🧱 The `<WindowManager />` Component
- 🧩 Providing `availableWindows`
- 🗺 Defining a Layout
- 📐 Top Bar & Status Bar
- 🎨 Theming System
- ⚙️ Remaining Props
- 🧠 JavaScript API: Contexts
  - 🔧 WindowManagerContext
  - 🪟 WindowFrameContext
  - 📦 WindowContext
- 📦 Saving & Restoring Layouts
- 🧼 Wrap Up
- 🔮 Coming Soon

---

## 🚀 Introduction

`vue-win-mgr` is a Vue 3-based layout and window manager designed for building creative applications that demand powerful, flexible, and dynamic interfaces.

Inspired by tools like **Blender**, **Qt Creator**, and other professional-grade apps, it allows you to create sophisticated layout systems with minimal boilerplate.

### 📐 Core Concepts

- **WindowManager**: Defines the screen space.
- **Window Frames**: Regions of the screen that can be resized, split, or merged.
- **Windows**: Individual components you provide, hosted inside frames.
- **Frame Modes**:
  - `SINGLE`: One window at a time (swap out with menu).
  - `TABBED`: Like a browser — multiple window tabs.
  - `MWI`: Free-floating window chaos (in a good way).

👉 You bring your Vue components. The window manager handles layout, snapping, tabs, drag-and-drop, and more.

---

## 🧱 The `<WindowManager />` Component

This is the heart of the system. Drop it into your Vue template, and it takes care of rendering everything according to the `availableWindows` and `layout` you give it.

```html
<WindowManager
	ref="windowManagerEl"

	:availableWindows="availableWindows"
	:defaultLayout="layout"

	:showTopBar="true"
	:showStatusBar="true"
	:topBarComponent="MyHeaderBar"
	:statusBarComponent="MyStatusBar"

	:splitMergeHandles="true"
	mwiBGPattern="/bg_pattern.png"

	:theme="{
		frameBGColor: '#002244',
		tabTextColor: '#ccc',
	}"
/>
```

You can also use **named slots** for the top and status bars:

```html
<WindowManager :showTopBar="true" :showStatusBar="true">
	<template #topBar>
		<!-- custom header content -->
	</template>
	<template #statusBar>
		<!-- custom footer content -->
	</template>
</WindowManager>
```

Yes, you can **mix and match**: use a component for one bar and a slot for the other.

---

## 🧩 Providing `availableWindows`

This array tells the WindowManager what Vue components are valid windows. There are two ways to define them:

### ✅ Preferred: Object Form (Verbose)

```js
const availableWindows = [
	{
		window: Viewport,
		title: "Scene Viewport",
		slug: "viewport",
		icon: 'icons/viewport.png'
	},
	{
		window: Notes,
		title: "Notes",
		slug: "notes",
		icon: 'icons/notes.png'
	}
];
```

### ⚡ Shorthand: Constructors Only

```js
const availableWindows = [Viewport, Notes, About, Settings];
```

Slugs will be **auto-generated** from the component name. The slug generator looks for:
1. `component.name`
2. `component.__name`
3. filename from `component.__file`

### ⚠️ TIP:
Always prefer the object format for full control. Use the constructor-only form for quick prototypes.

---

## 🗺 Defining a Layout

Layouts describe **how your screen is broken into regions** (frames), and **which windows** live in each region.

```js
const layout = [
	{
		name: "window",
		top: 0,
		left: 0,
		bottom: 1080,
		right: 1920
	},
	{
		name: "MainView",
		windows: ['viewport'],
		style: FRAME_STYLE.TABBED,
		left: 0,
		right: ["ref", "window.right-460"],
		top: 0,
		bottom: ["ref", "window.bottom-300"]
	},
	// more frames...
];
```

### 🧮 Frame Boundaries

Each frame defines `top`, `left`, `right`, and `bottom` using one of:

| Format | Meaning |
|--------|---------|
| `100` | Absolute pixel value |
| `['val', 50]` | Same as the raw number, above - absolute pixel value |
| `['val', 50, '%']` | Adding '%' item, 50% of parent frame |
| `['ref', 'MainView.right']` | Reference to another frame edge |
| `['ref', 'MainView.right-460']` | Reference to another frame edge with math. Only + or - supported |

### 🧩 Window Entries

```js
windows: [
	"notes",
	{ kind: "viewport", props: { someProp: true } }
]
```

You can mix plain slugs and objects with props.

---

## 📐 Top Bar & Status Bar

To show bars at the top or bottom of the WindowManager:

```html
<WindowManager :showTopBar="true" :showStatusBar="true" />
```

Then, provide either:
- `:topBarComponent` / `:statusBarComponent`
- or named slots `#topBar`, `#statusBar`
- or both!

---

## 🎨 Theming System

Pass a `theme` object to control look & feel.

```js
theme: {
	frameBGColor: '#444',
	tabTextColor: '#ccc',
	windowBGColor: '#fff'
}
```

**Full list of available theme keys:**

```js
const defaultThemeColors = {

	// background colors
	systemBGColor: '#000',
	topBarBGColor: '#31313B',
	statusBarBGColor: '#31313B',
	frameBGColor: '#737378',
	windowBGColor: '#EFEFEF',
	mwiBGColor: '#39393E',
	menuBGColor: 'rgba(0, 0, 0, 0.7)',
	menuActiveBGColor: 'rgba(255, 255, 255, 0.8)',

	// header colors for windows & tabs
	frameHeaderColor: '#5C5C60',
	frameTabsHeaderColor: '#2E2E30',
	frameTabsColor: '#4A4A4E',
	frameTabsActiveColor: '#737378',

	// text colors
	windowTitleTextColor: 'rgb(209, 209, 209)',
	tabTextColor: 'rgb(150, 149, 149)',
	activeTabTextColor: 'rgb(209, 209, 209)',
	menuTextColor: '#EFEFEF',
	menuActiveTextColor: '#000',
	menuDisabledTextColor: '#999',

	// blur for the window menus
	menuBlur: '2px',

	// hamburger theme
	hamburgerIconColor: 'rgba(255, 255, 255, 0.5)',
	hamburgerIconColorHover: '#FFF',
	hamburgerCircleColor: 'none',
	hamburgerCircleColorHover: 'rgba(255, 255, 255, 0.25)',

	// close buttons for floating windows & tabs
	closeButtonCircle: 'none',
	closeButtonCircleHover: 'rgba(255, 0, 0, 0.3)',
	closeButtonXColor: 'rgba(0, 0, 0, 0.5)',
	closeButtonXColorHover: 'rgba(255, 255, 255, 1)',
}
```


All values are **reactive and hot-swappable at runtime**.

---

## ⚙️ Remaining Props

| Prop | Type | Description |
|------|------|-------------|
| `availableWindows` | Array | Required list of window definitions |
| `defaultLayout` | Array | Required layout definition |
| `showTopBar` / `showStatusBar` | Boolean | Optional toggle bars |
| `topBarComponent` / `statusBarComponent` | Component | Optional bar components |
| `splitMergeHandles` | Boolean | Toggles split/merge handle visibility |
| `mwiBGPattern` | String | Background pattern for MWI frames |
| `theme` | Object | Theme overrides |

---

## 🧠 JavaScript API: Contexts


The `vue-win-mgr` system provides three JavaScript context objects you can get, to access some programmatic functionality.

- WindowManagerContext - control top-level component features
- WindowFrameContext - control a window frame in JS
- WindowContext - control a window in JS

### 🔧 WindowManagerContext

```js
const ctx = windowManagerEl.value.getContext();
ctx.showTopBar(false);
ctx.loadLayout(savedLayout);
```

#### All Methods

| Method | Description |
|--------|-------------|
| `showTopBar(bool)` | Show/hide the top bar |
| `showStatusBar(bool)` | Show/hide the status bar |
| `showSplitMergeHandles(bool)` | Enable/disable the corner handles |
| `loadLayout(layoutObj)` | Load a new layout definition |
| `resetLayout()` | Revert to default layout |
| `getLayoutDetails()` | Get the current layout structure |


### 🪟 WindowFrameContext

Inside a window component:

```js
const frameCtx = inject("frameCtx");
frameCtx.setFrameStyle(FRAME_STYLE.MWI);
frameCtx.addWindow("notes");
```

#### All Methods

| Method | Description |
|--------|-------------|
| `addWindow(slug, props = {})` | Add a window to the current frame |
| `getAvailableWindowKinds()` | List all windows allowed in this frame |
| `getFrameDimensions()` | Returns `{ top, left, bottom, right, width, height }` |
| `getWindows()` | Returns `WindowContext[]` for windows in the frame |
| `closeAllWindows()` | Close all windows in the frame |
| `setFrameStyle(newType)` | Change frame style (`SINGLE`, `TABBED`, `MWI`) |
| `getFrameStyle()` | Returns `{ styleName, styleValue }` |


⚠️ **Limitation**: The frameCtx does **not** update if the window is moved to another frame.

### 📦 WindowContext

Also inside window components:

```js
const windowCtx = inject("windowCtx");
windowCtx.setTitle("Custom Title");
windowCtx.close();
```

#### All Methods

| Method | Description |
|--------|-------------|
| `getTitle()` | Get the window’s title |
| `setTitle(title)` | Set the window’s title |
| `close()` | Close the current window |
| `setKind(slug)` | Change window kind to another slug |


---

## 📦 Saving & Restoring Layouts

You can persist layouts using `getContext().getLayoutDetails()` and reapply them later with `loadLayout()`:

```js
const layout = windowManagerEl.value.getContext().getLayoutDetails();
localStorage.setItem("myLayout", JSON.stringify(layout));

// later...
const saved = JSON.parse(localStorage.getItem("myLayout"));
windowManagerEl.value.getContext().loadLayout(saved);
```

---

## 🧼 Wrap Up

`vue-win-mgr` is flexible, powerful, and built to scale alongside serious creative applications. Whether you're building an editor, dashboard, IDE, or a strange new thing that defies classification — it’s got you covered.

Let your components do their thing, and let the window manager handle the rest.

---

## 🔮 Coming Soon

- Configurable `SNAP_SIZE` for docking precision
- Customizable split/merge drag sensitivity
- Support for temporary/non-persistent window managers

---

MIT Licensed · Made with ❤️ by [Greg Miller]

