# Phase 68 — Discussion log

## 3-area discussion (2026-06-15)

### Area 1 — Intent / Requirements

CHROME-01 says: "...unclose tab (Ctrl+Shift+T), incognito (Ctrl+Shift+N), and other common Chrome keyboard shortcuts". The "and other" clause is open. ROADMAP Phase 68 success criteria pin down unclose + incognito. User decided: **"maybe 4-8" buttons** — leave the exact set as agent's discretion within the user's range.

### Area 2 — Design Approach

- **Where does the chrome deck live?** Config only (in `config.yml`), not a new addon. Reasoning: the chrome deck is already a config entry; `action` button + `key_macro` already exists. No new code.
- **How are the buttons modeled?** `type: action` with `key_macro: "string"` (simplest form, already tested).
- **What about the existing dead "New tab" placeholder at position 0?** It has no `key_macro` and no `commands` — tapping it is a no-op per `action.tsx:30-39`. CHROME-01 says "additional keystroke-action buttons" — leaving a dead placeholder violates the spirit. Decision: **replace it with a real `key_macro: "ctrl+t"` action**.
- **System back button?** Injected by runtime at n-1. No explicit config. With 7 buttons (0-6) on a 15-key deck, position 14 is free.

### Area 3 — Tradeoffs

- **Config + fixture vs. config only.** Config only = no regression coverage for the chrome deck. With a fixture, the loader validates the deck shape and button set. User decided: **add a fixture**.
- **Scope.** 7 buttons = 1 existing (real action) + 6 new. Inside the user's "4-8" range. Skipping lower-priority shortcuts (focus address bar, downloads, history) → future quick task.
- **No new code path.** This phase is config + fixture, not code. Matches the gap-closure pattern (small, surgical).

## Agent discretion items

- **Icon names** — used Lucide names: `square-plus`, `x`, `rotate-ccw`, `eye-off`, `rotate-cw`, `refresh-cw`, `terminal`. The existing config uses `square-plus` so this set is consistent.
- **Fixture scope** — loader + deck-shape assertions (button set, positions, key_macro values, no back-button collision). Does NOT unit-test keystroke delivery (no headless browser in the test suite).
- **Order of buttons** — kept "New tab" at position 0 (where the existing placeholder was) and grouped closing/reopening next to each other (close + unclose at 1-2), incognito next to them, then reload controls, then dev tools. Layout is loosely "navigation → tabs → reload → debug" reading order.
