# Phase 31: CLI Dev Watch Mode Argument Forwarding - Context

**Gathered:** 2026-05-30
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore the workspace-root `cli:dev` watch seam so it truthfully starts the real raw-source CLI path and honors forwarded command arguments such as `emulate --port 8912`, without widening the watch feature into a new dev server, bundler workflow, or a second hot-reload system.

</domain>

<decisions>
## Implementation Decisions

### Dev Watch Contract
- `cli:dev` remains the full-process `tsx watch` seam for raw source edits; this phase fixes contract drift rather than redefining the seam.
- Bare `pnpm cli:dev` should still launch the documented default path `start --config config.yml`.
- Forwarded args such as `pnpm cli:dev emulate --port 8912` should reach the real CLI entrypoint truthfully instead of being swallowed by the watch wrapper.
- Phase 31 should preserve the distinction between the external full-process watch seam and the narrower in-process config-owned reload seam.

### Scope Boundary
- This phase is only about watch-mode command forwarding and truthful default startup behavior.
- This phase should not add new CLI commands, new watch targets, or a custom wrapper UX unless the existing raw CLI path cannot express the needed behavior honestly.
- This phase should prefer the narrowest fix that re-aligns the root script, docs, and regression tests.

### Agent's Discretion
- Exact script shape for how the default `start --config config.yml` behavior and forwarded args coexist, as long as both behaviors are truthful and testable.
- Exact regression-test location and command coverage for the fixed forwarding seam.
- Exact doc wording updates needed to keep README and script assertions aligned.

</decisions>

<specifics>
## Specific Ideas

- The reported failing path is `pnpm cli:dev emulate --port 8912`, where after a recent script change "nothing happened".
- Existing docs and tests still describe `cli:dev` as the workspace-root `tsx watch` loop over `packages/cli/src/**/*`, `config.yml`, `themes/**/*`, `addons/**/*`, and `builtin-addons/**/*`, restarting the real `start --config config.yml` path.
- The current root script no longer matches that documented contract because it ends at `packages/cli/src/cli/index.ts --` while the CLI entrypoint still requires an explicit subcommand.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/05-hot-refresh-and-button-error-helper/05-CONTEXT.md`
- `.planning/phases/05-hot-refresh-and-button-error-helper/05-02-PLAN.md`
- `.planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-VERIFICATION.md`
- `package.json`
- `packages/cli/package.json`
- `packages/cli/src/cli/index.ts`
- `packages/cli/src/cli/commands/start.test.ts`
- `README.md`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/cli/index.ts` is the real yargs entrypoint and still requires an explicit command via `.demandCommand(1, ...)`.
- `packages/cli/src/cli/commands/start.test.ts` already locks the intended root-script contract and is the most direct regression seam for Phase 31.
- `README.md` already documents the intended dev-refresh contract and should stay synchronized with the live script.

### Established Patterns
- Phase 5 and Phase 28 already locked `cli:dev` as the truthful full-process raw-source restart seam on `tsx watch`, separate from the daemon's in-process reload graph.
- Repo guidance prefers minimal contract-restoring fixes over inventing new wrapper behavior.
- Workspace-root scripts and package-local `dev` aliases are expected to stay aligned.

### Integration Points
- Root `package.json#scripts.cli:dev` is the primary broken seam.
- `packages/cli/package.json#scripts.dev` delegates to the workspace-root `cli:dev` script and must remain truthful.
- `packages/cli/src/cli/commands/start.test.ts` should pin both the default command path and the forwarded-args behavior once fixed.
- `README.md` should match the final command contract so docs, tests, and runtime stay synchronized.

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---
*Phase: 31-cli-dev-watch-mode-argument-forwarding*
*Context gathered: 2026-05-30*
