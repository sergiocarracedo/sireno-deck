# Phase 5: Hot Refresh and Button Error Helper - Context

**Gathered:** 2026-05-30
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Phase 5 is a runtime-truth phase, not a convenience-only tooling phase. Its job is to make hot refresh honest again across the two live seams that already exist in this repo: the external `cli:dev` `tsx watch ... start --config config.yml` loop and the in-process reload path inside `packages/cli/src/cli/commands/start.ts`. It also adds one shared button-facing runtime error helper that renders a warning triangle plus a four-digit error code for button-level failures, while keeping invalid config reloads on the existing full-deck temporary error surface.

## Implementation Decisions

### Hot Refresh Boundary
- Phase 5 should treat both live refresh seams as part of the product truth: the external raw-source `tsx watch` dev loop and the in-process `start.ts` reload path.
- The phase should make their boundaries explicit instead of pretending they are the same mechanism.
- Config, theme, addon, and React source edits should prefer an honest full runtime rebuild/reload first; narrower refresh behavior is only allowed where the runtime already owns that seam explicitly.

### Error Surface Contract
- Keep invalid config reload failures on the existing temporary full-deck error surface in `packages/cli/src/deck/runtime.ts`.
- Add the new warning-triangle plus four-digit error helper as a button-facing surface for runtime/render/action failures that belong to a specific button context.
- Do not collapse every error path into one generic surface unless planning later proves that unification is both safe and truthful.

### Diagnostics Contract
- Logs for the new shared button error helper must be deck- and button-aware.
- Minimum diagnostic contract should include deck identity, button position, button type, and error code.
- The button UI itself should stay compact: warning triangle plus four-digit code, with richer detail living in logs rather than on-device text walls.

### Refresh Trigger Policy
- Prefer explicit full reload behavior for React/theme/addon source edits first.
- Reuse narrower invalidation only where the runtime already owns it clearly, such as mounted button invalidation paths.
- Do not introduce magical partial-refresh behavior that blurs the existing Node-owned runtime boundary.

### Agent's Discretion
- Exact file-level definition of which source changes belong to the in-process reload graph versus the external `tsx watch` seam.
- Exact runtime integration point for the shared button error helper (`reportRuntimeError`, button render wrappers, or nearby runtime-owned surfaces) once planning confirms the narrowest truthful seam.
- Exact error-code allocation strategy and how deck/button-aware diagnostics are formatted in logs without over-designing a long-term error taxonomy in this phase.

## Specific Ideas

- Tighten the `start.ts` reload contract so config and source edits re-enter the real runtime truthfully instead of leaving hot-refresh behavior half-owned between watch layers.
- Add a shared button-facing error presentation helper that can be reused across built-in and addon-backed button failures without touching the existing config-error deck behavior.
- Prove the logging contract with focused tests that include deck id, button position, button type, and the surfaced error code.
- Keep the phase narrow: honest reload behavior and one shared button error helper, not a general runtime error framework rewrite.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`
- `.planning/phases/24-mounted-addon-render-contract/24-CONTEXT.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-CONTEXT.md`
- `package.json`
- `packages/cli/package.json`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/cli/commands/start.test.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/runtime.test.ts`
- `packages/cli/src/util/errors.ts`
- `packages/cli/src/render/dom-host-deck-document.tsx`

## Existing Code Insights

### Reusable Assets
- `package.json` already exposes the truthful workspace-root `cli:dev` seam on `tsx watch ... start --config config.yml`.
- `packages/cli/src/cli/commands/start.ts` already owns in-process reload orchestration through `watchConfigFiles(...)` and `reloadRuntime()`.
- `packages/cli/src/deck/runtime.ts` already has runtime-owned temporary full-deck config-error handling through `showTemporaryErrorDeck(...)`.
- Mounted button runtime methods already expose `invalidate()` on a runtime-owned seam.

### Established Patterns
- Runtime behavior ownership stays in Node, not React.
- Emulator/browser mode must stay on the real runtime and render path.
- UI primitives such as `Text`, `Chip`, and `Icon` are core-owned and should remain the styling foundation instead of spawning a new visual system for errors.
- Explicit behavior is preferred over hidden fallback or magical refresh heuristics.

### Integration Points
- Any hot-refresh improvement has to respect both the external `tsx watch` loop and the in-process reload path in `start.ts`.
- The new button-facing error helper must coexist with, not accidentally replace, the existing full-deck config reload error surface unless a later plan proves that replacement intentionally.
- Deck/button-aware diagnostics should be wired close to runtime-owned button execution/render failure seams, not bolted on at arbitrary UI leaves.

## Deferred Ideas

- Broad runtime error taxonomy or a universal shared error framework for every possible failure class.
- Fine-grained magical partial refresh for arbitrary source edits beyond seams the runtime already owns explicitly.
- Replacing the existing config-error temporary deck unless Phase 5 evidence proves that is necessary.

---
*Phase: 05-hot-refresh-and-button-error-helper*
*Context gathered: 2026-05-30*
