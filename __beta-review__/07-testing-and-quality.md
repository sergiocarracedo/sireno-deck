# 07 — Testing & Quality Gates

Scope: test inventory, failing tests, typecheck/lint/format gates, missing CI, coverage blind spots.

## Findings

### [07-testing-and-quality #1] [P0] 15 tests failing across 24 suites
**Evidence:** `pnpm test` → 1,303 passed / 15 failed / 24 failed suites. Failing: `config.test.ts`, `logger-format.test.ts`, `addon-core-lock.test.ts`, `emulator.test.ts`, `decks.test.ts` (emoji-selector), `display-count-formatter.test.ts`, `display-rate-bytes-formatter.test.ts`, `network-throughput-metric.test.ts`, `addon-decks.test.ts`, `Text.test.tsx`, `factory.test.ts` (Linux null session provider).
**Impact:** CI cannot pass; contributors don't know which red is intentional.
**Effort:** M
**Fix sketch:** Update tests to match current behavior, or fix code; do it in one batched PR with a top-level summary.
**OSS-impression:** Red CI at first glance.

### [07-testing-and-quality #2] [P0] `pnpm typecheck` has ~304 diagnostics
**Evidence:** Run shows missing modules (`./install`, `../render/icon-resolver`, `../../provider/types`), missing exports, stale interfaces, rootDir violations.
**Impact:** Cannot trust the typecheck signal; merge conflicts invisible.
**Effort:** L
**Fix sketch:** Land the P0 boundary/build/version fixes; sweep the rest in batches per category.
**OSS-impression:** Massive red baseline.

### [07-testing-and-quality #3] [P0] `pnpm lint` fails (4 errors)
**Evidence:** Restricted import in `media-player/components/__tests__/MediaSurface.test.tsx`; file-extension violations in `emoji-selector/buttons/launcher/{frontend,config}.{tsx,ts}`; restricted frontend import in `packages/cli/src/index.ts`.
**Impact:** Boundary violations caught; not yet fixed.
**Effort:** S
**Fix sketch:** Fix the import paths; rename `.tsx` to `.ts` where appropriate.
**OSS-impression:** Boundary enforcement already firing.

### [07-testing-and-quality #4] [P0] Coverage excludes SPA, .tsx, and most UI files
**Evidence:** `vitest.config.ts` `include: ["packages/cli/src/**/*.ts"]`; excludes `.tsx`, `frontend/`, `emulator/`.
**Impact:** Coverage number is misleading; UI is uncovered.
**Effort:** M
**Fix sketch:** Switch to `**/*.{ts,tsx}` with `jsdom` env override for `frontend/`, `emulator/`, `src/ui/`.
**OSS-impression:** Coverage is the wrong number.

### [07-testing-and-quality #5] [P0] No CI workflow
**Evidence:** No `.github/workflows/` or equivalent.
**Impact:** No automated enforcement.
**Effort:** M
**Fix sketch:** Add `.github/workflows/ci.yml` with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` matrix on Linux/macOS/Windows.
**OSS-impression:** First impression: project unmaintained.

### [07-testing-and-quality #6] [P1] `cli/commands/run.test.ts` and `start.test.ts` mock almost every dependency
**Evidence:** `cli/commands/__tests__/run.test.ts` is large; mocks executor, providers, bridge, config.
**Impact:** Good for wiring checks; misses real integration problems (token not reaching bridge).
**Effort:** M
**Fix sketch:** Add an integration test that wires real providers + bridge + token; asserts token reaches hello.
**OSS-impression:** Test coverage shape.

### [07-testing-and-quality #7] [P1] No test for actual token-passes-to-bridge wiring
**Evidence:** Token chain broken in production; no test catches it.
**Impact:** The P0 token bug shipped without CI detection.
**Effort:** S
**Fix sketch:** Integration test: start `startWsBridge({ expectedToken })`; client with wrong token → close(4001); with right token → hello OK.
**OSS-impression:** Integration test gap.

### [07-testing-and-quality #8] [P1] No test for production HTTP server SPA fallback
**Evidence:** `http-server.ts` doesn't serve `/decks/:deckId`; no test asserts fallback behavior.
**Impact:** Bug shipped silently.
**Effort:** S
**Fix sketch:** Add a test that requests `/decks/any-id` and expects `index.html`.
**OSS-impression:** Missing test.

### [07-testing-and-quality #9] [P1] Environment-sensitive tests
**Evidence:** `logger-format.test.ts` (depends on TTY); `network-throughput-metric.test.ts` (depends on live `/sys`).
**Impact:** Tests fail in CI containers.
**Effort:** M
**Fix sketch:** Make tests force TTY/non-TTY state; mock `/sys` reads.
**OSS-impression:** CI reliability.

### [07-testing-and-quality #10] [P1] No schema-doc drift test
**Evidence:** Addon READMEs use stale `core:*` names; no test asserts schema matches docs.
**Impact:** Drift inevitable.
**Effort:** M
**Fix sketch:** Add a `docs-as-tests` runner that parses each addon README's YAML.
**OSS-impression:** Drift detection.

### [07-testing-and-quality #11] [P1] `runtime.test.ts` is ~1600 LoC and involved in typecheck drift
**Evidence:** `deck/__tests__/runtime.test.ts`.
**Impact:** Maintenance hotspot.
**Effort:** M
**Fix sketch:** Split per-feature; introduce a small fixture builder.
**OSS-impression:** Largest test file.

### [07-testing-and-quality #12] [P1] Several test directories have no tests
**Evidence:** `cli/main.ts`, `cli/cwd.ts`, `cli/commands/{logs,reload,restart,update-config}.ts`, `service-manager.ts`, `service/install.ts`, `service/render-template.ts`, `config/{discovery,builtin-icons,icon-resolver,reference-expander,index}.ts`, `core/{watcher,icon-source}.ts`, `deck/{host-context,runtime-subscriptions,system-buttons/registry}.tsx`, `system/providers/{shared,error}.ts`.
**Impact:** Coverage blind spots.
**Effort:** L
**Fix sketch:** Add minimal unit tests for each.
**OSS-impression:** Coverage gaps.

### [07-testing-and-quality #13] [P1] No end-to-end frontend ↔ WS bridge test
**Evidence:** No test starts a real daemon and connects a frontend.
**Impact:** The most valuable tests are missing.
**Effort:** L
**Fix sketch:** `tests/e2e/full-daemon.test.ts` boots CLI + bridge + frontend client.
**OSS-impression:** E2E coverage missing.

### [07-testing-and-quality #14] [P1] Coverage threshold not set
**Evidence:** `vitest.config.ts` defines provider but no threshold.
**Impact:** Coverage can drop silently.
**Effort:** S
**Fix sketch:** Set `threshold: { statements: 80, branches: 70, functions: 80, lines: 80 }`; gate CI.
**OSS-impression:** No guardrail.

### [07-testing-and-quality #15] [P2] Test roots created without unmount
**Evidence:** `packages/cli/src/themes/default/__tests__/ButtonFrame.test.tsx`.
**Impact:** Cross-test pollution.
**Effort:** S
**Fix sketch:** Use Testing Library `render` + `cleanup`.
**OSS-impression:** Test hygiene.

### [07-testing-and-quality #16] [P2] No test for ws-bridge cross-client broadcast bug
**Evidence:** `ws-bridge.ts:143-160`; no test catches it.
**Impact:** Privacy bug shipped.
**Effort:** S
**Fix sketch:** Test: two clients; one subscribes; broadcast should reach only the subscriber.
**OSS-impression:** Missing test.

### [07-testing-and-quality #17] [P2] No test for hot-reload leak
**Evidence:** `addon-handler-bridge.ts` hot-reload path not exercised.
**Impact:** Memory leak shipped.
**Effort:** M
**Fix sketch:** Reload test: subscribe to poller; trigger reload; assert poller disposed.
**OSS-impression:** Missing test.

### [07-testing-and-quality #18] [P2] No fuzz test for `keyMacro` parsing
**Evidence:** `methods.ts:156-186` and `key-macro/parser.ts`.
**Impact:** Edge cases untested.
**Effort:** S
**Fix sketch:** Add property-based fuzz: random strings → parser.
**OSS-impression:** Coverage gap.

### [07-testing-and-quality #19] [P2] No fuzz test for `shellQuote` / `escapeForPSDoubleQuote`
**Evidence:** Provider escape functions.
**Impact:** Edge cases untested.
**Effort:** S
**Fix sketch:** Property test: for any string, escape+unescape round-trips through shell.
**OSS-impression:** Coverage gap.

### [07-testing-and-quality #20] [P2] Test fixture builders not centralized
**Evidence:** Several test files hand-roll fake addons, fake providers, fake bridges.
**Impact:** Inconsistency.
**Effort:** M
**Fix sketch:** Move to `__tests__/__fixtures__/` with stable factories.
**OSS-impression:** Test structure.

### [07-testing-and-quality #21] [P2] `pnpm format:check` passes despite two configs
**Evidence:** `.oxfmtrc.json` vs `oxfmt.json`.
**Impact:** Either config can pass CI; one is lying.
**Effort:** S
**Fix sketch:** Delete one; re-run format.
**OSS-impression:** One-config rule.

### [07-testing-and-quality #22] [P2] No test for daemon startup race
**Evidence:** `cli/commands/start.ts` lacks lockfile; no test catches race.
**Impact:** Race shipped.
**Effort:** M
**Fix sketch:** Two concurrent `start` calls in test; second should fail.
**OSS-impression:** Race test missing.

### [07-testing-and-quality #23] [P3] `setup.ts` is global but contains jsdom-specific imports
**Evidence:** `packages/cli/emulator/src/__tests__/setup.ts`.
**Impact:** Couples Node tests to jest-dom.
**Effort:** S
**Fix sketch:** Split into `setup.ts` (global) and `setup-jsdom.ts` (per env).
**OSS-impression:** Test hygiene.

### [07-testing-and-quality #24] [P3] No `coverage` script in `package.json`
**Evidence:** Root scripts lack `test:coverage`.
**Impact:** Coverage not collected by default.
**Effort:** S
**Fix sketch:** Add `test:coverage: vitest run --coverage`.
**OSS-impression:** Convenience missing.

### [07-testing-and-quality #25] [P3] No HTML coverage report
**Evidence:** `vitest.config.ts` only sets provider.
**Impact:** Coverage not browsable.
**Effort:** S
**Fix sketch:** Add `reporter: ["text", "html"]`.
**OSS-impression:** Coverage UX.

### [07-testing-and-quality #26] [P3] No test for `addon-handler-bridge` `dispose` ordering
**Evidence:** `addon-handler-bridge.ts` `dispose()` ordering not asserted.
**Impact:** Race window unverified.
**Effort:** S
**Fix sketch:** Test: register poller + service + abort controller; dispose; assert all unsubscribed in order.
**OSS-impression:** Test gap.

### [07-testing-and-quality #27] [P3] No test for `outputClient/real.ts` brightness contract
**Evidence:** `outputClient/real.ts` 302 LoC.
**Impact:** Hardware path untested.
**Effort:** M
**Fix sketch:** Mock device; assert brightness change calls.
**OSS-impression:** Hardware test gap.

### [07-testing-and-quality #28] [P4] Several test files have inconsistent describe naming
**Evidence:** Some use `'when X'`, others `'X'`.
**Impact:** Minor inconsistency.
**Effort:** S
**Fix sketch:** Standardize.
**OSS-impression:** Style drift.