# Summary

> Synthesis of `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`.

## What it is

Sireno Deck is a Node.js CLI that drives an Elgato Stream Deck from a YAML config, with a plugin system (3rd-party TS addons) and a real-or-emulated frontend. It exists so power users can script their deck — actions, key macros, paste, system overlays — without Elgato's official software and without writing per-key UI code.

## How it works (one paragraph)

A single Node service (`packages/cli/src/`) owns all state — config, runtime, addon backends, active-app polling, gesture detection, command execution. It exposes a WebSocket protocol (`api/protocol-internal.ts`) to a Vite-bundled React frontend (`packages/cli/frontend/`). In real mode, the daemon spawns Playwright, screenshots the frontend, and blits to the device. In emulator mode, a second Vite app (`packages/cli/emulator`) embeds the frontend in an iframe and injects clicks over the same WS connection. Both paths flow through `runtime.dispatchGesture`, the single entry point that resolves `tap/dbl-tap/hold` per-key and broadcasts via the `runtime:gesture:${buttonId}` channel.

## What's interesting

1. **No DOM in addon rendering** — addons render React via a custom reconciler host config; the frontend Vite SPA does use the real DOM, but addon authors never import `react-dom`.
2. **Auto-discovered addon decks** — any deck an addon defines in its manifest is registered at load; `internal?: true` opts out of user config surfaces (planned in P5).
3. **Service is authoritative on the active deck** — the frontend never decides navigation; it renders whatever `deck-config` message the service sent.
4. **Two shapes for addon decks** (`AddonDeckFactory` vs `AddonDeckDefinition`) — currently both work; new code should pick `AddonDeckDefinition`.

## What needs to change (v1.7)

Five planned changes, sized for a single milestone:

- **P1** Add React Router so per-deck URLs reflect the active deck (service still picks it).
- **P2** Make `gestureHandlers` an enforced opt-in filter (default-deny; breaking change for 9/10 addons that need to declare `['tap']`).
- **P4+P5** Auto-register addon decks + `internal?: boolean` on `AddonDeckDefinition`.
- **P6** Show `SplitActionSurface` on the n-1 slot of *every* deck — main, sub, overlay (with the right primary action for each: settings / back / dismiss).
- **P8** Rename `backend` → `service` (terminology only, separate PR).

## Why these are the right next changes

- The P1/P2/P4/P5/P6 set closes the gap between the architecture doc's intent and the code. Without them, addon authors can't reliably ship decks, can't restrict gesture handlers, and the n-1 system slot only renders on the overlay deck.
- P8 is deferred — pure rename, no behavior change, easy PR when nothing else is in flight.

## Risks

- **P2 is breaking.** Every addon (built-in or third-party) that uses `onTap/onDblTap/onHold` must declare `gestureHandlers`. The audit list (9 of 10 built-ins) is documented in `ARCHITECTURE.md §8.2`.
- **Hardware latency is real.** Profile gating on `SIRENO_PROFILE=1` + `SIRENO_PROFILE_BACK_TRANSITIONS=1` already exists at `packages/cli/src/util/profile.ts`. The acceptance criterion for P6 (settings-deck → previous-deck <200ms) requires real-hardware measurement that no dev environment provides.

## What NOT to do

- Don't reintroduce learnship phases/quick ceremony. The architecture doc + roadmap are the source of truth now. AGENTS.md describes a lean workflow.
- Don't "fix" the 79 pre-existing `runtime.test.ts` failures opportunistically — they're from Phase 42/67 and need their own forensics.
- Don't re-run research — `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` are already grounded in the codebase. Update them when the code changes, not on a schedule.