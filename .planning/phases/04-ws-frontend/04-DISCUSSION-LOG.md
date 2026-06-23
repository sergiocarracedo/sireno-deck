---
phase: 04-ws-frontend
date: 2026-06-23
mode: standard
---

# 04-DISCUSSION-LOG

## Pre-existing context

CONTEXT.md did not exist prior to this session (only `04-PHASE.md`). The user selected "Update it" expecting one to exist; the workflow treated this as a fresh write.

## Areas discussed

### Area 1 — Addon frontend module loading

**Question:** How does the frontend vite app discover and load an addon's React render modules?

| Option | Description |
| --- | --- |
| Build-time (vite plugin imports each addon's main statically) — RECOMMENDED | Bundle grows with addon count; simplest mental model; HMR per addon |
| Runtime dynamic import via virtual module | Smaller initial bundle; HMR works; better for large addon ecosystems |
| Runtime fetch + eval over WS | Maximum flexibility; lowest performance; biggest security surface |

**User choice:** "Build-time (vite plugin imports each addon's main statically) (Recommended)"

**Rationale:** Bundle growth is acceptable for the built-in set + small 3rd-party ecosystem. HMR per addon is a nice property. Simpler mental model for addon authors (their frontend/main is just an exported function).

### Area 2 — State sync granularity

**Question:** How does the bridge push state updates to the frontend?

| Option | Description |
| --- | --- |
| Per-channel pub-sub — RECOMMENDED | Matches Phase 03 architecture; granular; scales with subscription count |
| Per-deck snapshot on every change | Simpler frontend; more bytes on wire |
| Delta-only updates with sequence numbers | Most efficient; most complex |

**User choice:** "Per-channel pub-sub (Recommended)"

**Rationale:** Architectural alignment with Phase 03. Subscription model means bandwidth scales with usage, not deck size.

### Area 3 — Reconnect strategy

**Question:** When the WS disconnects, what does the frontend do?

| Option | Description |
| --- | --- |
| Auto-reconnect with exponential backoff — RECOMMENDED | Resilient to daemon restarts; visual status badge possible |
| Auto-reconnect immediate | Simpler but hammers bridge if daemon down |
| Fail-hard | Simplest; worst UX for long sessions |

**User choice:** "Auto-reconnect with exponential backoff (Recommended)"

**Rationale:** Realistic for long-running sessions. Daemon may restart for updates; brief network blips happen. Backoff cap at 30s prevents busy loops.

## Areas delegated to agent's discretion

- Concrete React component shapes (`<Deck>`, `<ButtonFrame>`, addon `render()` return values)
- HOC vs render-prop pattern for `useButtonAction`
- Visual layout (grid dimensions, button spacing)

## Deferred ideas (out of scope for Phase 04)

- Theme system → Phase 08
- Hardware Playwright pipeline → Phase 06
- Emulator shell → Phase 05
- Prod HTTP server with token injection → Phase 10

## User feedback observed

User is direct ("don't tell me to execute things you can do that are not real UAT") — keep conversational exchanges to decisions, not mechanical verification.
