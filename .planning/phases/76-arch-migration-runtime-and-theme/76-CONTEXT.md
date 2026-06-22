# Phase 76: Architecture migration — wire real decks, themes, and button actions end-to-end

**Gathered:** 2026-06-22
**Mode:** lean (deep walk deferred)
**Status:** Ready for planning

<domain>
## Phase Boundary

The Phase 75.1 architecture split (CLI / Frontend Server / Frontend + WS bridge) is in place and the transport works end-to-end. What it does NOT yet do is drive the actual user experience.

This phase wires the new architecture so it produces the user-visible behavior the old `dom-host/` system used to produce, **without reviving dom-host**:

1. **Real deck rendering in the Frontend Server** — when a deck ID is selected (CLI default, deck picker, or navigation event), the deck iframe renders the real buttons from `loadedConfig.config.decks[deckId].buttons[*]` with the resolved theme, instead of a placeholder date-time tile.

2. **Button actions wire up** — `button-action` WS messages (from real hardware via the headless browser, or from emulator mouse-to-button) drive the runtime: navigate to a new deck, dismiss an overlay, run a command, toggle state. Today the CLI just logs them.

3. **Deck routing works for both regular and overlay decks** — pressing a button that targets a regular deck pushes history; an overlay deck replaces (no history). Already partially wired in Phase 75.1-03; verify it survives surfaces-from-config and runtime wiring.

4. **Overlay deck lifecycle** — overlay decks (active-app detection, chrome, etc.) auto-show and auto-hide based on the existing `process_names + autoShow: false` semantics. The bridge transports the triggers; the frontend reacts.

</domain>

<decisions>
## Implementation Decisions

### Scope (locked from user intent 2026-06-22)
- In: real deck/button rendering with theme, button-action runtime wiring, deck routing (push/replace), overlay deck auto-show/hide.
- Out: any new capabilities, new addon authoring surface, new config schema fields. (Same transports — just wire them to the actual product behavior.)

### Architecture (locked from Phase 75.1)
- Three layers stay clean: CLI owns OS/hardware/state, Frontend Server serves React, Frontend renders. Only the WS bridge mediates.
- No revive of `dom-host/`. The new runtime replaces it. (Phase 75.3 will retire the dead code.)
- Built-in addon frontends stay statically imported (option 2 from Phase 75.1-02).
- URLs are injected via env (Vite `transformIndexHtml` plugin) — see `.planning/solutions/best-practices/env-injection-via-vite-transformindexhtml-2026-06-22.md`.

### Wire shape (carry-forward from Phase 75.1, to be verified)
- `ViteDeckRenderer.sendDeckConfig(deckId, surfaces)` sends the rendered deck over WS (already cached + re-broadcast on connect).
- `ViteDeckRenderer.onButtonAction(handler)` subscribes to button actions; handler calls runtime mutation (navigate, toggle, run command).
- `DeckPage` (React) subscribes to deck-config messages + sends button-action messages.
- `EmulatorShell` mouse-to-button already produces `button-action` messages — those should reach the same handler.

### Gray areas (DEFERRED — to be deep-walked in a freer-context session)
- **Surfaces-from-config translation** — the contract between `loadedConfig.config.decks[deckId].buttons[*]` and the React `SurfaceSpec[]` per keyIndex. This is the big design decision (where does the translation live? CLI? Frontend Server? Both?). Today's deck picker re-sends placeholders.
- **Theme injection timing** — when the active theme changes mid-session, does the deck re-render with the new theme, or stay on the old one until navigation? How is theme resolved at boot (env? first deck-config? runtime WS message)?
- **Overlay auto-show trigger transport** — how does the CLI tell the frontend "dismiss overlay X" vs "show overlay X"? New WS message types? Reuse `deck-config` with empty surfaces?
- **Snapshot pipeline parity** — when the headless browser renders the deck for real hardware, is the snapshot capture still triggered the same way (per render event)? Does the new architecture preserve Phase 35's live-resampling loop?
- **Button-action roundtrip latency budget** — what is acceptable end-to-end delay (press → deck change) for both real hardware and emulator? Profile instrumentation exists (`SIRENO_PROFILE=1`).
- **State persistence across deck changes** — does the runtime keep toggle state in-memory only, or persist? (Phase 24 has addon session store; not yet wired through WS bridge.)
- **Error surfacing in the new architecture** — how does the CLI surface runtime errors (config reload fail, addon crash) in the new UI? Old system had an "error deck" overlay.

### Agent's Discretion
- Exact file boundaries inside the runtime.ts rewrite.
- Test strategy for end-to-end behavior verification (headless Chromium vs explicit Playwright vs in-browser harness).

</decisions>

<specifics>
## Specific Ideas

From the user's verbatim quote on 2026-06-22 (m0897):

> "I want to continue with the architecture migration. Now we must show the decks and buttons with the correct theme in the fronten server, and ensure button actions (both real or emulated, works). Deck routing should work, overlay decks change, etc"

The "etc" at the end suggests the user expects the full user-visible behavior to come back online, not just a partial fix.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/phases/75.1-arch-split-cli-fe-fs-ws-bridge/75.1-VERIFICATION.md` — what 75.1 delivered + its deferred items (the runtime.ts rewrite is in there as "deferred #5")
- `.planning/phases/75.1-arch-split-cli-fe-fs-ws-bridge/75.1-06-SUMMARY.md` — the deck picker (UI + WS plumbing only, no real surfaces yet)
- `.planning/solutions/best-practices/env-injection-via-vite-transformindexhtml-2026-06-22.md` — URL injection pattern
- `.planning/solutions/best-practices/ws-broadcast-small-stable-lists-on-connect-2026-06-22.md` — broadcast-on-connect protocol pattern
- `.planning/solutions/workflow-issues/split-vite-root-move-config-and-source-atomically-2026-06-22.md` — atomic code-move rule
- `packages/cli/src/render/protocol.ts` — current WS message schema (9 types including decks-list + select-deck)
- `packages/cli/src/render/ws-bridge.ts` — bridge server side
- `packages/cli/src/deck/runtime.ts` — current runtime that needs rewriting (or surgical surgery — TBD during plan-phase)
- `packages/cli/src/dom-host/` — the OLD system (51+ files, scheduled for retirement in Phase 75.3). The new architecture replaces this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/frontend/src/Deck.tsx` — Vite-served deck render (currently placeholder; needs to be wired to real surfaces-from-config)
- `packages/cli/frontend/src/pages/DeckPage.tsx` — deck page host
- `packages/cli/frontend/src/ws-client.ts` — WS client with `parseIncoming` dispatcher
- `packages/cli/src/render/browser-renderer.ts` — headless Chromium launcher + snapshot pipeline (Phase 35 live-resampling loop lives here)
- `packages/cli/src/config/loader.ts` — config loader (produces `loadedConfig.config.decks`)
- `packages/cli/src/deck/runtime.ts` — current deck runtime (overlay deck logic, navigation, button action dispatch). Blocked behind `dom-host/` retirement.

### Established Patterns
- All WS messages are zod-discriminated-union schemas in `protocol.ts` — any new message type follows that pattern.
- Built-in addon frontends are statically imported in `frontend/src/Deck.tsx` via `BUILTIN_ADDON_FRONTENDS = { ... }`.
- Emulator + deck renderer share the WS bridge — button-action messages flow from emulator's mouse-to-button the same way real hardware events do.
- React Router push/replace preserves `?ws=` query string — established in Phase 75.1-03.

### Integration Points
- The CLI's `runtime.ts` (current) is the integration point for button-action handling. It needs to be migrated to drive state via WS bridge instead of in-process events.
- The Frontend's `DeckPage` is the integration point for surface rendering. It currently reads WS-deck-config messages but renders placeholders.
- `ViteDeckRenderer` (CLI side) is the integration point for sending deck-config + receiving button-action — needs new methods (`sendDeckConfig(deckId, surfaces)`, `onButtonAction(handler)`).

</code_context>

<deferred>
## Deferred Ideas

- **dom-host/ retirement** (Phase 75.3 candidate) — touching 51+ files, 100+ refs. The new architecture is meant to fully replace it before this phase ships, OR at least before Phase 75.3 is planned. Plan-phase needs to decide.
- **Real-hardware UAT** — deferred since Phase 75.1; can only be unblocked when a Stream Deck device is attached. All current verification is headless Chromium.
- **Dynamic loading of raw-source addon frontends** — option 2 chose static imports for built-ins; raw-source addons deferred from Phase 75.1-02.
- **State persistence across deck changes** — out of scope unless explicitly raised during deep walk.

</deferred>

---

*Phase: 76-arch-migration-runtime-and-theme*
*Context gathered: 2026-06-22 — lean mode, deep walk deferred*
