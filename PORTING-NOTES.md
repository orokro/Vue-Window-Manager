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
  `AvailableWindowList`, `DragHelper`, `utils`.
- No framework imports anywhere. `AvailableWindowList<TComponent>` is generic over
  whatever a "component" is, so the same core can drive Vue/Svelte/Angular later.

**React (`react-win-mgr`)**

- `useReactive` — `useSyncExternalStore` over a core effect, so a component subscribes
  to exactly the signals it read.
- `WindowHost` — the stable-host-div portal (see below).
- `WindowManagerView`, `WindowFrameView` — frames, resize handles, corner
  split/merge handles, modal split overlay, theme variables.

**Working:** frame layout, edge-drag resize with transitive edge selection, corner-drag
split and merge with live preview, SINGLE-style frames, layout load/save, theming.

**Not yet:** tabs, MWI, drag-between-frames, context menus, empty-frame picker.

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

## Next slice

Tabs, done properly: in-strip drag reordering, and tear-off **only** once the pointer
leaves the strip. That ordering is the whole feel and the reason the other React dock
libraries feel cheap — they tear on first movement because it's easier.

Needs, roughly: `WindowDragSystem` ported to core, a drag layer component, the
drop-target regions, canvas text measurement for tab widths, and the "fantom tab"
placeholder. Hit-testing is worth replacing with geometry math against `screenPos`
rather than porting `document.elementFromPoint` — the manager already knows every rect.
