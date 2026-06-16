# Phase 68 — Chrome overlay deck extensions

Gap closure for v1.6 (CHROME-01).

## Context

CHROME-01 (REQUIREMENTS.md): "The config chrome overlay deck includes additional keystroke-action buttons: unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N), and other common Chrome keyboard shortcuts."

ROADMAP Phase 68: Chrome overlay deck has buttons for: unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N). All chrome deck buttons use the `action` button type with `key_macro` or command-based keystroke execution.

Current state: chrome deck in `config.yml` (lines 79-87) has **1 button** at position 0 (`label: 'New tab'`, icon, but **no key_macro and no commands** → the button is a dead placeholder).

## Decisions

- **D-01** — Scope: edit the root `config.yml` chrome deck directly (no new addon, no separate chrome overlay config file). The chrome deck is a config-only construct and `action` button + `key_macro` already exists (per quick task 042).
- **D-02** — Button set (7 total, replacing the existing dead placeholder + 6 new):
  - Position 0: **New tab** — `key_macro: "ctrl+t"`, icon `icon://square-plus` (replaces dead placeholder; label kept)
  - Position 1: **Close tab** — `key_macro: "ctrl+w"`, icon `icon://x`
  - Position 2: **Unclose tab** (CHROME-01 explicit) — `key_macro: "ctrl+shift+t"`, icon `icon://rotate-ccw`
  - Position 3: **Incognito** (CHROME-01 explicit) — `key_macro: "ctrl+shift+n"`, icon `icon://eye-off`
  - Position 4: **Reload** — `key_macro: "ctrl+r"`, icon `icon://rotate-cw`
  - Position 5: **Hard reload** — `key_macro: "ctrl+shift+r"`, icon `icon://refresh-cw`
  - Position 6: **Dev tools** — `key_macro: "F12"`, icon `icon://terminal`
- **D-03** — Use `action` button type with `key_macro: "string"` for all chrome buttons (simplest form; `key_macro: "ctrl+shift+t"` already tested in `core-buttons/index.test.ts:569-583`).
- **D-04** — Fixture: add `packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml` containing a full chrome deck (matching the new shape) and a loader test asserting: (a) config loads without error, (b) chrome deck has `process_names: [chrome]`, (c) 7 buttons at the expected positions with the expected `key_macro` values, (d) no button collides with the system back button slot (n-1 is free).
- **D-05** — Replace the existing dead "New tab" placeholder with a real `key_macro: "ctrl+t"` action. The placeholder does nothing on tap (action button without `commands` or `key_macro` is a no-op per `action.tsx:30-39`); leaving it in would violate the spirit of CHROME-01.
- **D-06** — System back button is automatically injected by the runtime at n-1 (no explicit configuration needed). On a 15-key deck the chrome deck occupies positions 0-6 and the back button is at position 14. No collision.
- **D-07** — No new code required. All work is config + fixture. The `action` button's `key_macro` support ships in core.
- **D-08** — Out of scope: lower-priority shortcuts (focus address bar Ctrl+L, downloads Ctrl+J, history Ctrl+H, bookmarks Ctrl+D, fullscreen F11, etc.) — left as a future quick task if the user wants more.

## Tradeoffs

- **Config-only + small fixture** keeps scope minimal (matches gap-closure pattern). The fixture covers load + button-set validation; real keystroke delivery is UAT-only (cannot be unit-tested without a focused browser).
- **7 buttons** is the middle of the user's "4-8" range and covers the 2 explicit CHROME-01 shortcuts + 5 most-common Chrome shortcuts. Going to 8 would require adding a less-essential shortcut (focus address bar or downloads).
- **No addon** because the chrome deck is already config-driven and a `key_macro` action is the right primitive; an addon would add indirection without value.

## Deferred

- Adding more shortcuts (focus address bar, downloads, etc.) — quick task if wanted.
- Synchronizing with a chrome-specific theme override — out of scope for CHROME-01.
