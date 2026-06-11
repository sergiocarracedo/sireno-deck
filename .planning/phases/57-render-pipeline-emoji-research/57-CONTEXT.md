# Phase 57: Render pipeline & emoji research - Context

**Gathered:** 2026-06-11
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **research outputs only** — no user-facing feature changes. The three research items (RES-01, RES-02, RES-03) produce documented findings that unblock Phase 58 (performance fixes), Phase 59 (emoji paste), and Phase 62 (overlay autoShow).

- **RES-01:** Profile the gesture-to-render pipeline to find the root cause of the ~1s back button delay and slow weather page transitions.
- **RES-02:** Document the keystroke simulation design (the implementation is already in place; this phase locks the *plumbing*).
- **RES-03:** Confirm the emoji category data is deduplicated and document the findings.

</domain>

<decisions>
## Implementation Decisions

### RES-01: Profiling scope
- **Instrumented runs only.** Add `pino` debug logs at the runtime.ts hop boundaries (`onKeyEvent`, `handlePress/Release/Tap/Hold/DblTap`, `navigateToDeck`/`goBack`, `activateDeckSurface`, `renderDeckSurface`, `renderMountedDeckButtons`, `emitRenderedDeck`, browser capture loop). Run a back-button scenario in emulator mode and real hardware if available. Measure ms per hop.
- No static analysis, no CPU profile (`--prof` / `clinic.js`).
- Output: ranked bottleneck list with measured timings.

### RES-02: pasteText plumbing
- **Option A: Wire in runtime.** `methods.pasteText` becomes a thin wrapper in `createDeckRuntime` that calls `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write()`. Existing `clipboard.ts` stays pure (no `keyMacro` import).
- Platform paste key:
  - Linux/Windows: `ctrl+v`
  - macOS: `cmd+v`
- Pure-Wayland: the `keyMacro` provider returns the `unsupported` adapter, so the keystroke step is a no-op. `clipboardy.write` still runs, so users on Wayland get the original "tap does nothing" behavior unchanged.
- Output: a design doc with the runtime wrapper shape + test plan.

### RES-03: Category audit
- **Data audit only.** Confirmed: `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` has zero overlap between `smileys` (41 unique chars) and `people` (41 unique chars) — `comm -12` returns 0 matches.
- User's "smiles/people duplicated" perception is likely visual (the 2×3 launcher grid contains `😂` which also appears in the smileys category) and out of scope for this research phase.
- RES-03 marked resolved. User perception deferred to UX feedback backlog.

### Research output format
- **Single `57-RESEARCH.md`** in `.planning/phases/57-render-pipeline-emoji-research/`. Sections: `## RES-01 Profile Trace`, `## RES-02 pasteText Design`, `## RES-03 Category Audit`. Downstream `plan-phase 57` reads this to scope implementation plans.
- No SUMMARY.md per research item — single document keeps research atomic and easy to reference.

### Agent's Discretion
- Exact log line format and pino level for the instrumentation (consistent with existing runtime pino usage).
- Whether to add an opt-in flag to disable the new `pasteText` keystroke for users who want clipboard-only behavior (recommend: yes, escape hatch, defaults to keystroke).

</decisions>

<specifics>
## Specific Ideas

- RES-01 instrumentation should be guarded by `logging.level=debug` or a `SIRENO_PROFILE=1` env var so the perf hit is opt-in, not always-on.
- RES-02 `pasteText` should not block on the keystroke if the platform is unsupported — the `keyMacroProvider.send()` call should resolve immediately (no-op) without failing the whole `pasteText` promise.
- RES-03: note the launcher grid (😂 🔥 ❤️ ⭐ 🍕 🎵) for the UX feedback backlog so the perception source can be investigated later if needed.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 57/58/59 definitions and dependency chain
- `.planning/REQUIREMENTS.md` — RES-01, RES-02, RES-03, PERF-01..03, EMO-15..17 definitions
- `packages/cli/src/deck/runtime.ts` — `methods.pasteText` (line 950), `methods.keyMacro` (line 983-986), gesture FSM, render pipeline
- `packages/cli/src/util/clipboard.ts` — current `pasteText` (clipboardy.write only, line 3)
- `packages/cli/src/system/key-macro/` — `linux.ts`, `darwin.ts`, `windows.ts`, `unsupported.ts`, `parser.ts`
- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — emoji source data
- `CHANGELOG.md` lines 49-58 (2026-06-06) — original paste keystroke shim removal rationale

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`keyMacroProvider` in runtime** (runtime.ts:390-391) — already created in `createDeckRuntime`, has `send(steps)` method. Reuse this directly from `pasteText` wrapper.
- **`getKeyMacroProvider()` factory** in `packages/cli/src/system/key-macro/` — platform-aware, returns `unsupported` for pure-Wayland.
- **`parseKeyMacro('ctrl+v')`** — parser already handles modifier+key syntax.

### Established Patterns
- **`createButtonMethods` factory** in runtime.ts:940-995 — all `methods` are bound to the runtime context. The `pasteText` rewrite slots into this factory.
- **Pino structured logging** — runtime uses `pino` with `runtimeLogger`. New debug instrumentation follows the same `logger.debug({ hop, ms }, 'profile')` shape.

### Integration Points
- `methods.pasteText` is called by `emojiEntryButton.onTap` (emoji-selector/buttons/entry.tsx:43) and any addon that wants to inject text.
- `keyMacroProvider` is constructed in `createDeckRuntime` and passed to `methods.keyMacro` (runtime.ts:983-986). The new `pasteText` wrapper needs the same provider reference.

</code_context>

<deferred>
## Deferred Ideas

- **User perception of "smiles/people duplicated"** — likely visual confusion from the launcher grid or category labels. Defer to UX feedback backlog. Not a data problem.
- **Static analysis of render pipeline** — deferred (out of scope per RES-01 decision). Re-evaluate if instrumented runs don't pinpoint the bottleneck.
- **CPU profile (`--prof` / `clinic.js`)** — deferred. Add only if pino debug logs don't reveal the hotspot.
- **Opt-in flag to disable paste keystroke** — left to agent's discretion; if added, should be a config-level setting (e.g. `paste.keystroke: false` in config.yml).

</deferred>

---

*Phase: 57-render-pipeline-emoji-research*
*Context gathered: 2026-06-11*
