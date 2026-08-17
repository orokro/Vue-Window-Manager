# React port — notes so far

Branch: `react-port`. Slice 1 (layout engine) is working end to end.

```
src/                      Vue library — untouched, still builds
packages/core/            @win-mgr/core     — framework-agnostic, TypeScript
packages/react/           react-win-mgr     — React bindings + components
apps/demo-react/          vite + React demo
```

`npm install` at the repo root wires the workspaces. Then:

```
npm run dev:react      # demo on :5174
npm run typecheck      # core + react
npm run build:core
npm run build:react
```

The demo aliases both packages to their **source**, so editing the core shows up in the
browser with no rebuild in between.

---

## What's done

**Core (`@win-mgr/core`, ~2.4k lines TS, zero dependencies)**

- `signal.ts` — signal / effect / computed / batch / untracked / reactive. Keeps the
  `.value` shape the classes already used, so porting them was mostly an import swap.
- `WindowManager`, `WindowFrame`, `Window`, `EdgeMap`, `WindowLayoutHelper`,
  `AvailableWindowList`, `DragHelper`, `WindowDragSystem`, `utils`.
- No framework imports anywhere. `AvailableWindowList<TComponent>` is generic over
  whatever a "component" is, so the same core can drive Vue/Svelte/Angular later.

**React (`react-win-mgr`)**

- `useReactive` — `useSyncExternalStore` over a core effect, so a component subscribes
  to exactly the signals it read.
- `WindowHost` — the stable-host-div portal (see below).
- `WindowManagerView`, `WindowFrameView` — frames, resize handles, corner
  split/merge handles, modal split overlay, theme variables.
- `TabStrip`, `WindowDragLayer`, `MwiSurface`, `EmptyFrameMenu`, `Menu`, `frameMenus`,
  `measureText`, `coords`.

**Working:** frame layout, edge-drag resize with transitive edge selection, corner-drag
split and merge with live preview, all three frame modes (SINGLE / TABBED / MWI),
Chrome-style tab reordering and tear-off, drag-between-frames, drop-to-split, floating
windows with move / resize / z-order / desktop panning, the frame hamburger menu, the
empty-frame picker and merge arrows, layout load/save, theming.

Still zero runtime dependencies beyond `@win-mgr/core`. 29.1 kB js + 3.5 kB css,
gzipped.

**Not yet:** MWI task bar, start menu and minimise; right-click menus on frame edges;
serialising MWI window positions into a saved layout.

---

## Decisions worth remembering

### 1. The portal problem, and the fix

React's `createPortal` does **not** move DOM when its container changes — it unmounts
and remounts. Measured, both ways:

| | Vue `<Teleport>` | React naive portal | React stable host |
|---|---|---|---|
| same DOM node after retarget | yes | **no** | yes |
| uncontrolled input value | kept | lost | kept |
| component state | kept | lost | kept |
| mount effect runs | 1× | 2× | 1× |

So `WindowHost` creates **one** host `<div>` per window, portals into it exactly once,
and re-parents *the host itself* with `appendChild` when `window.domContainer` changes.
React never sees the container change, so it never reconciles it away.

Scroll position is still lost on a re-dock — but Vue's Teleport loses it too. That's a
browser behaviour of re-parenting nodes, not a React regression. Parity, warts included.

### 2. Deltas are no longer inverted

`gdraghelper` returned `start - current`, which is why the Vue call sites are full of
`startPos - dx` and `dx *= -1`. The new `DragHelper` returns `current - start` like
everything else in the world. If you port more call sites over, watch the signs.

### 3. Pointer events, and two traps they set

`DragHelper` is on Pointer Events with `setPointerCapture` (touch and pen come free).
Two things this cost, both fixed, both non-obvious:

- **Pointer capture starves other elements.** The corner split gesture needs the split
  overlay — which appears *underneath the cursor mid-drag* — to keep receiving events so
  it can position the cut. Capturing to the corner handle silently broke that: splits
  landed at offset 0 and produced zero-width frames. Corner drags now pass
  `{ capture: false }`; edge resizes still capture.
- **`preventDefault()` on `pointerdown` suppresses compatibility mouse events.** The
  overlay's `onMouseMove` therefore never fired during a corner-initiated split. It
  listens on `onPointerMove` now. Worth applying the same rule to the rest of the port:
  once a gesture starts on a pointer event, everything downstream must be pointer events.

### 4. StrictMode

`setContainerEl()` is idempotent — it only builds a layout when there isn't one.
Without that, React's development double-mount loads the layout twice and every frame
appears twice. The demo runs in `<StrictMode>` deliberately so this stays caught.

The manager is created through a ref guard rather than `useMemo`, because constructing
it attaches a global pointer listener and `useMemo` makes no promise about how often it
runs.

### 5. Cleanups taken while porting

- `EdgeMap` kept 8 lookup tables, 6 of which were duplicates (the original has a
  `// how is this different than x/y? idk` comment on them). Down to 2: `hMap`, `vMap`.
- `rangeOverlap` rewritten from 6 branches to 3. Verified equivalent to the original
  across all 6561 combinations of 0..8 — worth re-running if it's ever touched, since
  every adjacency decision in the system rests on it.
- `parseParams` / `applyKeys` deleted; TypeScript default parameters cover them.
- Tunables (`SNAP_SIZE`, `SMALLEST_WIDTH_OR_HEIGHT`, ...) moved from class statics to
  instance fields, so two managers on a page can differ and tests can dial them.
- `WindowFrame.getFrameDim()` still adds 2px to `top`. It's load-bearing —
  `checkValidLayout` uses the same rect — so it was left alone and commented.

---

## Slice 2 — tabs

### 6. The tab gesture

The behaviour being reproduced is Chrome's: horizontal movement reorders in place while
the neighbours slide out of the way, and the tab does not tear out of the frame until
it is pulled far enough VERTICALLY to genuinely leave the strip. `tabTearThreshold`
(30px) is the number that decides it. dockview / rc-dock / FlexLayout all tear on first
movement, which is much easier and feels cheap.

Mechanically:

- Tabs are absolutely positioned, not flexed, because a dragged tab has to sit at an
  arbitrary x. Widths come from canvas text measurement (`measureText.ts`).
- `transition: left 0.3s` on `.tab` is what makes displaced tabs glide. The tab under
  the cursor sets `transition: left 0s` so it tracks the pointer exactly.
- Reordering compares the dragged tab's LEFT EDGE against the resting left edges of the
  others — the same comparison the Vue version made when it sorted the whole tab array
  by x on every move.
- **Tab order IS `frame.windows` order.** There is no parallel ordering model, so a
  reorder survives re-render and serialisation with no extra bookkeeping. The Vue
  version kept `order` on a component-local tab array, which is why its `updateTabs`
  had to reassign and re-sort on every pass.

### 7. Hit testing is geometry now

The original rendered a lattice of invisible `.dropTarget` divs during a drag, found
them with `document.elementFromPoint()`, and read the frame ID and region back out of
HTML attributes. `WindowDragSystem.hitTest()` asks the geometry instead — the manager
already knows every frame's rect to the pixel. Faster, unit-testable with no DOM, and
the renderer no longer materialises elements purely so they can be hit.

The region bands reproduce the original CSS exactly (sides 15% capped at 80px, ends 25%
capped at 80px, ends stacked above sides) so a corner still resolves to a horizontal
split.

### 8. Tearing no longer collapses the source frame mid-drag

**Deliberate deviation.** The original tore with merge enabled, so pulling the last tab
out of a frame made that frame evaporate the instant the drag began — and if you then
dropped on nothing, it put the window back into a frame that no longer existed. Here
the source frame stays while you drag and is collapsed on drop instead, if it is still
empty. Same end state, no orphan, and the layout does not rearrange itself underneath a
gesture in progress. Flip it in `WindowDragSystem.tearWindow` if the original timing is
preferred.

Also: a cancelled drag returns the window to its original tab INDEX, not the end of the
strip.

### 9. Coordinate spaces

`frame.screenPos` has its origin at the frame container's PADDING box, because that is
where an absolutely positioned child starts. `getBoundingClientRect()` returns the
BORDER box. The container has a border, so converting a pointer event needs
`clientLeft` / `clientTop` subtracted too — see `coords.ts`. Being a couple of pixels
out looks like it works until you test hit detection near an edge.

`tabStripHeight` on the manager (25) must agree with `.frameHeader` in the stylesheet,
since the core hit-tests the strip geometrically rather than measuring the DOM.

---

## Slice 3 — MWI, menus, empty frames

### 10. The corner grips were mirrored

The Blender hatch stripes run PERPENDICULAR to the corner's inward diagonal: a top-left
corner is striped `/`, a top-right corner `\`. All four were inverted. Confirmed by
reading the original `window_frame_corners.png` sprite pixel by pixel rather than by
eye — the hatch direction is one of those things that reads as subtly wrong without
being obvious about why.

Watch the sign convention: in `repeating-linear-gradient` the angle is the direction the
gradient TRAVELS, and the visible bands sit at right angles to it. So the angle in the
CSS is the opposite of the stripe you see.

### 11. Portal events don't bubble where you think

Clicking a floating window's **body** didn't raise it, and the reason generalises.

Window content is rendered through a portal. React dispatches events from a portal along
the **React** tree, and a window's React parent is `WindowManagerView` — not the
`MwiWindow` that draws its chrome. So a React `onPointerDown` on the window div never
sees a click that landed on the window's own content.

The DOM tree has no such gap (the host element really is a descendant), so the fix is a
native `addEventListener` on the window element. **Anything else in this library that
needs to observe activity inside a window has the same constraint** — reach for a native
listener, not a React prop.

### 12. `backdrop-filter` creates a containing block

The submenu rendered at x=1868 on a 1280px viewport: present in the DOM, invisible on
screen. `.winMgrMenu` carries a `backdrop-filter`, and a filtered element becomes the
containing block for `position: fixed` descendants — so a submenu nested inside its
parent item had its "viewport" coordinates resolved against the parent panel.

Fixed by rendering every panel as a sibling of the root inside the (unfiltered) menu
layer, with the stack of open levels held in `MenuOverlay`. Nesting a fixed-position
popup inside a filtered ancestor is a trap worth remembering; `filter`, `transform`,
`perspective` and `will-change` all do the same thing.

### 13. Menu: hand-rolled, and why

`@radix-ui/react-dropdown-menu` measures **30.9 kB gzipped across 26 packages** — more
than this entire library. Measured, not guessed. `Menu.tsx` is ~380 lines with no
dependencies and covers what's actually needed: open at a point, nest, tick, disable,
separate, keyboard-navigate, dismiss.

### 14. Cascade has to run after layout normalisation

Floating windows placed during `loadLayout` were sized against frame geometry that was
still in the layout's own 1920x1080 coordinate space, so they came out far too big for
the real frame. `addWindow` now takes `cascade: false` during load, and
`WindowLayoutHelper` cascades MWI frames once `computeFrameLayout()` has run.

Two related things learned by watching it: sizing a cascaded window to "whatever is left
from here to the edge" makes each one nest exactly inside the previous, so every window
after the first is completely hidden — a fraction of the desktop works far better. And a
window defaulting to 640x480 on a small frame covers the entire desktop, leaving no
background to right-drag for panning.

### 15. SINGLE closes the other windows

Reverted to the Vue original's behaviour after Greg pointed out why it matters: a window
kept alive but hidden in SINGLE mode has no tab, no task-bar entry and no way to reach
it — so if it is playing audio or polling something, you have a process you can neither
see nor stop. Better to be destructive and obvious. One window per frame, Blender-style.

---

## Next slice

MWI extras: the Windows-style task bar, the start-menu affordance, and per-window
minimise/restore (they're coupled — minimise is only recoverable from the task bar).

Then: right-click menus on frame edges and the MWI background, and teaching
`getLayoutObject` to persist floating window positions and sizes so an MWI arrangement
survives a save/load round trip.
