# Roadmap

> v1.7 — Polish & 3rd-Party Fixtures. Source: `ARCHITECTURE.md` §8 + this file's P-list.

## Status legend

- `[ ]` not started
- `[~]` in progress
- `[x]` shipped
- `[?]` open question

## Phases

### P1 — React Router in frontend `[x]` shipped at `74d9dc59`

- `[x]` `react-router-dom ^7.18.1` (workspace root dep, hoisted for Vite).
- `[x]` `BrowserRouter` + `/decks/:deckId` route in `main.tsx`; catch-all → `/decks/main`.
- `[x]` `App.tsx`: `navigate(\`/decks/${deckId}\`, { replace: true })` on `deck-config`.
- `[x]` Service-driven nav — `deck-config` is the source of truth; URL is the read-only projection.
- `[x]` Emulator: no router needed (DeckFrame hosts the frontend in an iframe; iframe handles internal nav).
- `[x]` 2 vitest cases in `app-navigation.test.tsx` (URL updates + no-op on unknown surface).
- Skipped: per-button routes (out of scope); URL-driven nav (spec says service-driven).

### P2 — `gestureHandlers` enforced (default-deny)

- `[ ]` At addon load, walk every `buttonTypes` entry. If a backend has `onTap / onDblTap / onHold` and no `gestureHandlers` declared, **log warning and ignore the undeclared handlers** (silently strip).
- `[ ]` WS `deck-config` payload gains a per-button `gestureHandlers: GestureKind[]` field.
- `[ ]` Frontend's `ButtonSurface` reads `gestureHandlers` from the deck config and only forwards declared gestures.
- **Audit (must ship in this phase):**
  - `brightness` — declares no `gestureHandlers`; has `onTap` → add `['tap']`
  - `core-buttons` — audit each button type
  - `emoji-selector` — has `onTap` → add `['tap']`
  - `internal-settings` — back/dismiss/toggle use `onTap` → add `['tap']`
  - `media` — already declares `['tap']`; verify
  - `session` — has `onTap` → add `['tap']`
  - `system-status` — no backend gestures; no change
  - `value-display` — has `onTap` → add `['tap']`
  - `weather` — has `onTap` → add `['tap']`
  - `date-time` — no backend gestures; no change
- **[?]** Compatibility shim for 3rd-party addons? See `PROJECT.md` scope guardrails. Decision deferred.

### P4 — Auto-register addon decks on load

- `[ ]` `AddonRegistry` registers every entry in `manifest.decks` at addon-load time. Remove the requirement that the user lists addon decks in `config.yml`.
- `[ ]` User config can still *reference* an addon deck by `${addonName}:${deckKey}` to compose a custom main deck.
- `[ ]` Top-level addon-defined main decks (no `parentDeck`) become the root if user didn't define one.

### P5 — `internal?: boolean` on `AddonDeckDefinition`

- `[ ]` Add `internal?: boolean` to `AddonDeckDefinition` in `packages/cli/src/addon/api.ts`.
- `[ ]` `AddonRegistry` excludes `internal: true` decks from user-config discovery surfaces (CLI listing, schema completions, docs).
- `[ ]] Built-in addon decks opt in: `internal-settings:*`, `emoji-selector:*`.

### P6 — `SplitActionSurface` on n-1 of every deck

- `[ ]` `computeSystemButtonForSlotN1` returns the right action for **every** deck:
  - Main deck (navStack depth = 1) → primary: settings nav, secondary: null
  - Sub-deck (navStack depth > 1, not overlay) → primary: back, secondary: null
  - Overlay deck → primary: dismiss overlay, secondary: empty (currently works)
- `[ ]]` Verify the gesture channel: tapping the primary tile fires the correct runtime action.
- `[?]` Acceptance criterion: settings-deck → previous-deck transition <200ms (requires real hardware; no Stream Deck in dev).

### P8 — `backend` → `service` rename (terminology)

- `[ ]` Rename `*Backend` types/methods/fields where they read as "the long-lived Node process" to `*Service` (e.g., `AddonGlobalBackend` → `AddonGlobalService`, `AddonButtonBackendContext` → `AddonButtonServiceContext`).
- `[ ]]` Update internal field names + addon API in one commit (no behavior change).
- `[?]` Rename `SIRENO_ADDON_API_VERSION` if v2 is implied; otherwise keep at 1 and document the cosmetic rename.

## Out of v1.7

- Per-addon frontend authoring (only `date-time/frontend.tsx` exists today).
- Multi-row device support (XL has 32 keys; we ship `DEFAULT_KEY_COUNT = 15`).
- Mobile companion app.
- Hot-reload of addon code.
- Fixing the 79 pre-existing `runtime.test.ts` failures from Phase 42/67 (needs forensics, not a fix here).

## Done criteria

v1.7 ships when P1, P2, P4, P5, P6 all land and the audit list above is complete. P8 is its own follow-up PR.

## Open questions (collected, not blocking)

- P2 shim policy (see PROJECT.md scope guardrails).
- P6 hardware acceptance (defer to manual UAT).
- The "frontend-UI clicks bypass the gesture stream" known issue — fix on demand, not in this milestone.