# Phase 31 Research — CLI Dev Watch Mode Argument Forwarding

## Don't Hand-Roll

- Reuse `pnpm run` argument forwarding instead of inventing a new package-manager contract. [CITED: https://pnpm.io/cli/run]
- Reuse `tsx watch` as the existing full-process raw-source restart seam instead of widening into a second hot-reload system or a bundler watch path. [CITED: https://raw.githubusercontent.com/privatenumber/tsx/master/docs/watch-mode.md] [VERIFIED: package.json]
- Reuse the repo's existing CLI entrypoint at `packages/cli/src/cli/index.ts`; the fix is about feeding it truthful argv, not replacing yargs or adding a second command surface. [VERIFIED: packages/cli/src/cli/index.ts]
- Reuse the already-shipped regression seam in `packages/cli/src/cli/commands/start.test.ts` and the existing README refresh section to keep script, tests, and docs synchronized. [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: README.md]

## Common Pitfalls

- Do not point `cli:dev` at the raw CLI entrypoint without ensuring a real subcommand reaches yargs. The live CLI still requires one command via `.demandCommand(1, ...)`, so a bare watch wrapper that stops at `index.ts --` is not a truthful default seam. [VERIFIED: packages/cli/src/cli/index.ts] [VERIFIED: package.json]
- Do not silently redefine `cli:dev` into a bundler/watch-only workflow. The repo already documents and tests it as the full-process restart seam for `start --config config.yml`, distinct from the narrower in-process config-owned reload path. [VERIFIED: README.md] [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-RESEARCH.md] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-VERIFICATION.md]
- Do not rely on shell-only argument tricks that make the default-start behavior and forwarded-args behavior hard to reason about or hard to test. A narrow launcher owned by the repo is safer than opaque quoting gymnastics if the one-line script cannot express both behaviors honestly. [ASSUMED]
- Do not update the runtime seam without updating the documentation/test seam in the same phase. Phase 31 exists because the live script drifted away from the README and regression assertions. [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: README.md]

## Existing Patterns in This Codebase

- The root `package.json` is the authoritative workspace entrypoint for `cli:dev`, and `packages/cli/package.json#scripts.dev` simply delegates back to it. [VERIFIED: package.json] [VERIFIED: packages/cli/package.json]
- The repo already pins the watched include graph explicitly: `./packages/cli/src/**/*`, `./config.yml`, `./themes/**/*`, `./addons/**/*`, and `./builtin-addons/**/*`. Phase 31 should keep that graph unless a fix proves it is wrong, and current evidence does not show the include set is the bug. [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]
- The truthful raw-source seam historically ran the real CLI command path `packages/cli/src/cli/index.ts start --config config.yml` through `tsx watch`. That pattern is preserved in prior Phase 5 research and Phase 28 verification artifacts. [VERIFIED: .planning/phases/05-hot-refresh-and-button-error-helper/05-RESEARCH.md] [VERIFIED: .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-VERIFICATION.md]
- The current drift is localized: root `package.json#scripts.cli:dev` lost `start --config config.yml`, while the README and `start.test.ts` still describe and assert that contract. [VERIFIED: package.json] [VERIFIED: README.md] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]

## Recommended Approach

1. Restore a truthful runtime launcher for the root `cli:dev` seam.
   - Keep `tsx watch` and the existing include globs. [CITED: https://raw.githubusercontent.com/privatenumber/tsx/master/docs/watch-mode.md] [VERIFIED: package.json]
   - Resolve argv so bare `pnpm cli:dev` becomes `start --config config.yml`, while any explicit forwarded args such as `emulate --port 8912` pass through untouched to the real CLI entrypoint. [CITED: https://pnpm.io/cli/run] [VERIFIED: packages/cli/src/cli/index.ts]
   - Prefer a tiny repo-owned launcher module if that is the narrowest cross-platform way to express both behaviors clearly. [ASSUMED]

2. Re-pin the regression and docs seams around the restored contract.
   - `packages/cli/src/cli/commands/start.test.ts` should assert both the default-start contract and the forwarded-args contract, while continuing to prove `cli:dev` is not the bundler watch seam. [VERIFIED: packages/cli/src/cli/commands/start.test.ts]
   - `README.md` should mention both the bare invocation (`pnpm run cli:dev`) and a forwarded example such as `pnpm run cli:dev emulate --port 8912`, while preserving the distinction from the in-process config-owned reload seam. [VERIFIED: README.md]

3. Keep Phase 31 narrow.
   - No new commands.
   - No watch-graph redesign.
   - No daemon reload changes.
   - Only restore the already-intended full-process watch contract and make drift harder to reintroduce.

## Research Summary

- `pnpm run` already forwards args after the script name, so the package manager is not the blocker. [CITED: https://pnpm.io/cli/run]
- `tsx watch` already supports the repo's explicit include-glob pattern, so the watcher is not the blocker. [CITED: https://raw.githubusercontent.com/privatenumber/tsx/master/docs/watch-mode.md]
- The actual bug is the current root `cli:dev` script shape: it ends at `packages/cli/src/cli/index.ts --` even though the CLI entrypoint still demands a real subcommand. [VERIFIED: package.json] [VERIFIED: packages/cli/src/cli/index.ts]
- Therefore the correct Phase 31 plan is a narrow contract-restoration pass: restore default `start --config config.yml`, preserve truthful forwarded args, and synchronize runtime/docs/tests around that repaired seam. [VERIFIED: README.md] [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: .planning/phases/31-cli-dev-watch-mode-argument-forwarding/31-CONTEXT.md]
