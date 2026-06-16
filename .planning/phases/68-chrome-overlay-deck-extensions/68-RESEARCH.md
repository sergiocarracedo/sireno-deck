# Phase 68 — Research

> How to implement Phase 68 (chrome overlay deck extensions, CHROME-01) well.

## Don't Hand-Roll

- **Don't build a new chrome-specific addon.** The chrome deck is a config entry. `action` button + `key_macro` already supports the keystroke pattern (per quick task 042). Adding an addon would introduce indirection without value.
- **Don't write a custom key_macro executor.** `parseKeyMacro` in `packages/cli/src/system/key-macro/parser.ts` parses strings like `'ctrl+shift+t'`, and the per-platform providers (linux/darwin/windows/unsupported) already emit the correct keystroke sequence. Reuse them.
- **Don't add chrome-specific runtime code.** `process_names: ['chrome']` is matched by the existing `processNamesMatch` function (in deck/runtime). The active-app subsystem already maps foreground process to overlay deck.

## Common Pitfalls

- **The bundled action button's `key_macro` ↔ `commands` mutex is enforced on the bundled `BuiltinActionButtonSchema`, NOT the shared `AddonButtonActionConfigSchema`.** This is a deliberate choice — see `.planning/solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md`. Mutating the shared base would break `.shape` consumers in date-time, system-status, and emoji-selector addons. Don't move the mutex upward.
- **The existing "New tab" button in the chrome deck is a dead placeholder.** It has no `key_macro` and no `commands` — `action.tsx:30-39` makes the `onTap` a no-op in that case. CHROME-01 says "additional keystroke-action buttons" — leaving a dead placeholder violates the spirit. Replace it with a real `key_macro: "ctrl+t"` action.
- **process_names matching is substring-based and silently matches the empty string.** See `.planning/solutions/logic-errors/processnamesmatch-includes-empty-string-2026-06-10.md`. Don't introduce empty-string entries; the fixture should validate this.
- **The chrome deck is a sub-deck (process_names overlay on chrome).** System back button is runtime-injected at n-1. With 7 buttons at positions 0-6 on a 15-key deck, n-1 = 14 is free — no collision. If the button set ever expands, the n-1 slot must remain free.
- **Key_macro strings** — keep the syntax simple. `parseKeyMacro` accepts `ctrl+shift+t`, `ctrl+w`, `F12`, etc. The bundled tests in `core-buttons/index.test.ts:535-598` cover the standard patterns. Avoid advanced features (waits, multi-step) for chrome shortcuts — Chrome doesn't need them.
- **The chrome deck's button set should match CHROME-01's "and other common Chrome keyboard shortcuts" intent.** Just adding 2 buttons (unclose + incognito) would technically satisfy the literal CHROME-01 minimum, but the ROADMAP says "chrome overlay deck has buttons for: unclose tab, incognito" + success criteria mention the deck as a whole. 7 buttons is in the user's "4-8" range and includes the 2 mandatory + 5 most-common.

## Existing Patterns in This Codebase

- **Config deck shape** — `config.yml` lines 79-87 is the current chrome deck. Other decks (`main`, `emoji`) show the convention: `id`, optional `process_names`, `buttons` array with `{position, type, ...config}`.
- **Action button key_macro** — `packages/cli/src/builtin-addtons/core-buttons/buttons/action.tsx:10-69`. String form is simplest: `key_macro: "ctrl+shift+t"`. Object form: `key_macro: { tap: "...", "double-tap": "...", hold: "..." }`.
- **Action button key_macro tests** — `packages/cli/src/builtin-addons/core-buttons/index.test.ts:535-598`. Covers schema parse (string and object), onTap/onDblTap/onHold dispatch, commands+key_macro mutex.
- **Process name matching** — `packages/cli/src/deck/runtime.ts:201-240` (in `runtime.test.ts` test file; production code in the active-app subsystem). Substring match on trimmed process names.
- **Fixture convention** — `packages/cli/fixtures/phase-NN/config.*.yml`. Phase folders track test fixtures by phase number. Loader test pattern: `packages/cli/src/config/loader.test.ts:13-80`.
- **System back button injection** — handled in `runtime.ts` (per Phase 66's `SPLIT_ACTION_TYPE` wiring). No explicit config needed.

## Recommended Approach

**One plan, 3 tasks, autonomous Wave 1.** This is a config-only change. No code paths are added. No schema changes. The vertical slice is: edit `config.yml` chrome deck → add fixture → add loader test asserting chrome deck shape. All tasks land on a single PR.

- **Task 1: Edit `config.yml` chrome deck** — Replace the existing dead "New tab" placeholder with a real `key_macro: "ctrl+t"` action at position 0. Add 6 new buttons (close tab, unclose tab, incognito, reload, hard reload, dev tools) at positions 1-6. Icons via `icon://` Lucide names.
- **Task 2: Add fixture** — `packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml` containing a full chrome deck mirroring the new shape. Self-contained (no addon declarations, no theme override).
- **Task 3: Add loader test** — `packages/cli/src/config/loader.test.ts` (new `it` block) that writes the fixture to a temp `config.yml`, calls `loadConfig()`, and asserts: (a) config loads without error, (b) chrome deck has `process_names: ['chrome']`, (c) 7 buttons at positions 0-6 with the expected `key_macro` values + types, (d) position 7+ is undefined (chrome deck has exactly 7 buttons — n-1 free for the back button).

**Why a single plan, not multiple waves:**
- All three tasks are tightly coupled (config edit + fixture that mirrors it + test that asserts it).
- No new code, no schema, no API — this is the smallest possible vertical slice.
- A single plan matches the "tracer bullet" principle: one demoable behavior (chrome deck shows 7 keystroke buttons + back button at n-1 + no collisions) end-to-end.

## Confidence Levels

- **HIGH** that the `action` button + `key_macro` is the right primitive. Confirmed by 100+ matches across the codebase and 3 explicit tests in `core-buttons/index.test.ts`.
- **HIGH** that chrome OS-abstracted keystrokes work cross-platform. F12, ctrl+shift+T, ctrl+shift+N are universal. The key_macro subsystem has 4 platform providers (linux/darwin/windows/unsupported).
- **HIGH** that the system back button is runtime-injected at n-1 for any non-main deck. This is Phase 66 wiring; verified in `runtime.ts`.
- **MEDIUM** on icon names — Lucide name registry is the source of truth; chose names that match common Chrome actions (`x`, `rotate-ccw`, `eye-off`, `rotate-cw`, `refresh-cw`, `terminal`). If any of these are missing from the Lucide bundle, the runtime will fall back to a missing-icon placeholder (which is observable in UAT but not blocking).
- **HIGH** on the fixture/test pattern. Existing `loader.test.ts` writes configs to temp dirs and asserts shape — straightforward extension.

## Out of Scope

- Adding more chrome shortcuts (focus address bar Ctrl+L, downloads Ctrl+J, history Ctrl+H, bookmarks Ctrl+D, fullscreen F11, etc.) — future quick task if the user wants more.
- Synchronizing with a chrome-specific theme override.
- New code, new schemas, new APIs.
