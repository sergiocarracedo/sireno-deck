# Phase 10: Deck Reliability, Application Overlays, Config Includes, and Hardware Lifecycle — Research

**Researched:** 2026-07-21
**Phase goal:** The main deck renders image assets immediately, Chrome/VS Code/OpenCode overlays activate reliably, config files support nested path-relative includes, and real hardware shows a startup splash then clears to black on exit.

---

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|---------------------|-----|------------|
| Reading focused window title on GNOME Wayland | Use the existing `Window Calls Extended` GNOME extension (`org.gnome.Shell.Extensions.WindowsExt`) over `dbus-next`'s sessionBus — already loaded by `wayland-gnome.ts` for `FocusClass`. The same extension exposes `FocusTitle`, `FocusPID`, and `List`. | The current `wayland-gnome.ts` already requires this extension; adding `FocusTitle` reuses the same connection and the same install URL. No new external infrastructure. | [VERIFIED: github.com/hseliger/window-calls-extended README, packages/cli/src/system/providers/active-app/wayland-gnome.ts:25-115] |
| Loading YAML with custom directives (`!include`) | Use the `yaml@^2.9.0` `parseDocument` `customTags` option (a built-in feature of the library, not a plugin). | `yaml.parseDocument` already supports custom tags via the `customTags` schema option; we already call `parseDocument(raw, { keepSourceTokens: true })` in `config/loader.ts:83`. Adding `customTags: [{ identify, resolve, ... }]` covers `!include` with no new dependencies. | [VERIFIED: packages/cli/package.json yaml@^2.9.0, yaml docs https://eemeli.org/yaml/v2/#custom-tags] |
| Resizing/compositing a logo for the Stream Deck hardware | Use `sharp` (already a dependency of `@elgato/stream-deck` and used in `packages/cli/src/render/browser-renderer.ts:160-170`). It does load → composite → resize → raw RGB in 3-4 lines. | The existing per-frame rendering path (`browser-renderer.ts:160-172`) already encodes the exact device format: **72×72 raw RGB per key** (`resize(72,72,{fit:"fill"})` → `.removeAlpha()` → `.raw()`). We mirror that pipeline. | [VERIFIED: packages/cli/src/render/browser-renderer.ts:144-174] |
| React mounting before WS handshake completes (rendering with empty asset cache) | Frontend gate pattern: keep a `useState(false)` "ready" flag, set it to `true` only after the `assets` WS message has been applied; render skeleton while false. Mirrors `assets` registry semantics. | Established pattern across the codebase — `App.tsx` already subscribes to WS messages, and the React `useEffect` TDZ trap is already documented in `.planning/solutions/best-practices/react-useeffect-tdz-closure-trap-2026-07-20.md`. Use the `useRef` pattern from that solution. | [VERIFIED: .planning/solutions/best-practices/react-useeffect-tdz-closure-trap-2026-07-20.md, packages/cli/frontend/src] |

---

## Common Pitfalls

### Pitfall 1 — Reading `FocusTitle` without checking the extension is installed

**What goes wrong:** Calling `iface.FocusTitle` on a D-Bus interface that doesn't expose it throws a confusing TypeError, masking the real "extension not installed" condition.

**Why:** The extension might not be installed (most common), might be an older version, or might have a different D-Bus path. `dbus-next` will throw differently for each case.

**How to avoid:** Mirror the existing `probeExtension` logic: do a `Promise.race` with a 3000ms timeout, fall through to `logNull(...)` if the call fails. Then probe for BOTH `FocusClass` and `FocusTitle` in the same connection. Don't create a separate connection for the title. Use the same `installUrl` warn message.

### Pitfall 2 — Deep-merge vs concat semantics diverging from user expectation

**What goes wrong:** User writes `decks: !include decks-main.yml` and `decks: !include decks-overlay.yml`. With concat, both files' deck arrays merge; if both define a deck with the same `id`, the runtime sees duplicates.

**Why:** `!include` does not imply a deep-merge by default; the user has to choose.

**How to avoid:** Documented in CONTEXT.md: objects → deep merge, arrays → concat, last-wins on `id` collision. Implement as a single `mergeWithCollisionRule(result, incoming)` helper that checks `id` on incoming array elements. Log warn (don't fail) when a collision is resolved by last-wins.

### Pitfall 3 — Circular `!include` references

**What goes wrong:** `a.yml` includes `b.yml` includes `a.yml` → infinite loop, stack overflow.

**Why:** Recursive include resolution without cycle detection.

**How to avoid:** Maintain a `Set<string>` of visited absolute paths during recursion. If a path is revisited, throw `ConfigLoadError` with the cycle path clearly described. Mirror the existing `ConfigLoadError` error reporting style in `loader.ts:31-39,44-68`.

### Pitfall 4 — Sending splash before device is fully initialized

**What goes wrong:** `pushRawImage` runs before `device.fillKeyBuffer` is ready, throws "device not ready", splash never appears.

**Why:** The `RealOutputClient.init` sequence: `connectStreamDeck` → push splash → `spawnFrontendVite` → `BrowserRenderer.start`. If `connectStreamDeck` returns before the device is enumerable, `fillKeyBuffer` fails.

**How to avoid:** Place the splash call **AFTER** the `await connectStreamDeck(...)` resolves (not just after the call). Look at `run.ts:95` and confirm. Wrap the splash call in a try/catch that logs warn on failure (mirror `pushBlackFrame` style at `real.ts:218-224`).

### Pitfall 5 — Asset registry timing on the frontend

**What goes wrong:** React's first render fires before the WS connection has completed, so the `assets` message hasn't been processed; the deck renders with empty asset cache and shows fallback icons.

**Why:** `icon-asset-registry.getUnsentAssets(new Set())` is called from `run.ts:855-901` per WS connection. If the frontend mounts before the WS handshake completes, no assets have arrived yet.

**How to avoid:** Frontend keeps a "ready" gate (per Pitfall 1 guidance above). Show skeleton/spinner while the gate is false. Only flip to true once the WS `assets` message has been processed (the frontend's bridge handler updates the asset store). Use the `useRef` pattern to avoid the documented TDZ trap.

### Pitfall 6 — Splash background ≠ shutdown background causes a flash

**What goes wrong:** Splash uses `#efe3e1` (warm pinkish), shutdown uses black. The transition between splash and Playwright's first frame may show a brief pink → black flash.

**Why:** The user sees pink during startup, then black on shutdown. Visual discontinuity.

**How to avoid:** Splash composites logoFull.png on **black** background. Matches the black shutdown frame.

### Pitfall 7 — Bridge `onConnection` race during Vite HMR

**What goes wrong:** On Vite hot-reload, the new WS connection opens BEFORE the bridge's `onConnection` listener is registered, so the initial `assets` message is missed. Only affects dev — not cold-start. But it could be the source of "missing icons" reports.

**Why:** Listener registration race during HMR.

**How to avoid:** Register the `bridge.onConnection` listener BEFORE the WS client is created. Apply the `useRef` TDZ pattern from `react-useeffect-tdz-closure-trap-2026-07-20.md`. If the timing problem persists after applying the gate, the HMR-specific path needs separate handling.

### Pitfall 8 — Window title arriving async while overlay is already showing

**What goes wrong:** Polling gets `FocusClass` immediately (it's already in the cache), then a tick later gets `FocusTitle`. The overlay's `applyOverlay` runs twice — first with `windowTitle: null`, then with the real title. `window_name` trigger fails on the first poll, succeeds on the second → tiny flicker.

**Why:** Two D-Bus calls per poll, sequential.

**How to avoid:** Call `FocusClass` and `FocusTitle` IN PARALLEL (`Promise.all`) per poll. Emit the snapshot only when both have completed, so the first emission is consistent. This means the snapshot is always either `(name, null)` or `(name, title)` — never the inconsistent in-between state.

### Pitfall 9 — `!include` resolving relative paths from CWD instead of defining file

**What goes wrong:** A user runs `sireno-deck` from `/home/user/proj` but the config includes `./themes/dark.yml`. If we resolve relative to CWD, it works. But if the include path is `themes/dark.yml` (no leading `./`) and the user runs from a different directory, it breaks.

**Why:** Path resolution ambiguity.

**How to avoid:** Always resolve relative to the **defining file's directory** (not CWD). Absolute paths (starting with `/`) pass through unchanged. This matches user intent ("paths relative to the file defining them") and the existing `expandButtonReferences` pattern in `config/loader.ts:109`.

### Pitfall 10 — Same `!include` file used at multiple keys creates duplicate subtree content

**What goes wrong:** User writes:
```yaml
deckA:
  buttons: !include common-buttons.yml
deckB:
  buttons: !include common-buttons.yml
```
With shallow replace, both decks share the same array reference. Mutating one mutates the other.

**Why:** Reference aliasing if we don't deep-clone the resolved content.

**How to avoid:** After `resolveInclude` returns content, deep-clone it before inserting. Or use `structuredClone()` (Node 17+) — already available per Node engine.

---

## Existing Patterns in This Codebase

- **`RealOutputClient.pushBlackFrame`** (`packages/cli/src/outputClient/real.ts:200-225`): builds a zeroed RGB buffer of `keyCount * 3 * 8 * 8` bytes, sends `3 * 8 * 8` bytes per key. Wait — `8 * 8 = 64` doesn't match `browser-renderer.ts:167` (which uses 72×72). **Verified inconsistency: the pushBlackFrame uses 8×8 raw RGB (legacy / older SDK format), but the live browser-renderer path uses 72×72 raw RGB.** The splash should use the 72×72 format that the live path uses, NOT the 8×8 format that `pushBlackFrame` uses. This is a known inconsistency — the splash implementation needs to be 72×72 to be visually correct at the device's actual key resolution.

  Actually, re-reading: `pushBlackFrame` allocates `3 * 8 * 8 = 192` bytes per key but sends `buf.subarray(0, 3 * 8 * 8)` — so each key gets 192 bytes. That's an 8×8 raw RGB buffer. The device may downscale internally, OR the pushBlackFrame may be displaying at lower resolution than the live path. The splash should match the live path (72×72) for visual consistency with subsequent Playwright frames.

- **Per-frame resize in `browser-renderer.ts:160-172`**: sharp extracts → `.resize(72, 72, { fit: "fill" })` → `.removeAlpha()` → `.raw()` → `fillKeyBuffer`. **Use this exact pipeline for the splash.**

- **`addon-decks.ts` trigger extraction** (`packages/cli/src/cli/commands/addon-decks.ts:18-40`): extracts `process_name` / `window_name` from the trigger object and assigns to `processNames` / `windowNames` on the runtime deck. Both chrome-overlay's trigger and the (existing) opencode-overlay/vscode-overlay triggers pass through this code path unchanged.

- **`active-app.ts` Linux provider selection** (`packages/cli/src/system/providers/active-app.ts`): chooses wayland-gnome, x11 (linux), darwin, windows based on env. The wayland-gnome provider is the only path that returns `windowTitle: null`; fixing it solves the opencode-overlay trigger on Wayland.

- **`expandButtonReferences`** (`packages/cli/src/config/reference-expander.ts`, called at `loader.ts:109`): existing pattern for post-parse relative-path resolution against `configDir`. The `!include` resolver can mirror this pattern — run AFTER parse, BEFORE Zod validation.

- **`OutputHandle`** (`packages/cli/src/outputClient/types.ts:49-51`): already declares `pushBlackFrame()` and `pushRawImage(filePath: string)`. The latter is unimplemented — exactly the slot the splash fills.

- **`dbus-next` sessionBus usage** (`wayland-gnome.ts:67-83`): already imports `dbus-next`, gets session bus, creates proxy with timeout race. Extend, don't reinvent.

- **`useRef` pattern for WS client initialization** (from `.planning/solutions/best-practices/react-useeffect-tdz-closure-trap-2026-07-20.md`): applied when adding a frontend WS subscription that has a constructor side-effect.

- **Overlay dismissal on trigger change** (`.planning/solutions/logic-errors/overlay-trigger-changes-dismiss-previous-2026-07-17.md`): the runtime's `applyOverlay` already handles dismissing a previous overlay when its trigger no longer applies. Adding chrome-overlay will exercise this path.

---

## Recommended Approach

Given the four workstreams and the existing infrastructure, the implementation should:

1. **Splash + black shutdown (smallest, no cross-system deps):** Implement `OutputHandle.pushRawImage` in `RealOutputClient` using the same sharp pipeline as `browser-renderer.ts:160-170` (72×72 raw RGB per key, composite on black). Call between `connectStreamDeck` and `spawnFrontendVite`. Wrap in try/catch like `pushBlackFrame`.

2. **Wayland+GNOME window title (medium, isolated file change):** Extend `wayland-gnome.ts` to ALSO call `FocusTitle` in parallel with `FocusClass` (`Promise.all`). Update the `ProbeResult` interface to carry both methods. Update the emit path to populate `windowTitle` from the title result. Keep the same install URL fallback warning.

3. **Chrome overlay addon (medium, new files in external repo):** Create `~/works/opensource/sireno-deck-addons/chrome-overlay/` with `sirenodeck.json`, `index.js`, `assets/icon.png`. Register in `config.yml`. Mirror the vscode-overlay pattern. The button set is fresh and curated.

4. **Frontend asset timing (medium, frontend change):** Add a "ready" gate in the React tree that flips true only after the WS `assets` message has been processed. Show a loading skeleton while false. Use the `useRef` pattern from the documented TDZ trap solution.

5. **Nested YAML config includes (largest, affects config loader):** Implement `!include` as a parseDocument `customTag` in `config/loader.ts`. After parse, walk the parsed JSON tree, replace each `!include`-resolved node with the included file's content. Recursive with `visited: Set<string>` for cycle detection. Deep-merge for objects, concat-with-last-wins for arrays.

5 plans total, structured to be executed in 2 waves:
- **Wave 1** (independent, can run in parallel): Splash+shutdown, chrome-overlay addon, wayland-gnome title fix, frontend asset timing.
- **Wave 2** (depends on Wave 1): YAML config includes (touches the config loader — the most central change; better tested AFTER Wave 1 changes are stable).

Re-plan to **5 plans in 2 waves**. Each plan is a vertical slice — demonstrable end-to-end.

---
*Research: phase 10*