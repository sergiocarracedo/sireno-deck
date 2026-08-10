# 05 — Testing & Quality

---

## Quality gates (current)

| Gate      | Beta review (Jul 29)   | Pre-release (Aug 6)    | Trend  |
| --------- | ---------------------- | ---------------------- | ------ |
| Typecheck | ~304 errors            | 357 errors             | Worse  |
| Tests     | 15 failures, 24 suites | 24 failures, 24 suites | Worse  |
| Format    | Passes                 | Passes                 | Stable |
| Lint      | 4 errors               | OOM (inconclusive)     | Worse  |

---

## [TQ1] [P1] 357 typecheck errors

**Count:** 357 (up from ~304 in beta review, +53).

**Key categories observed:**

| Category                                | Approx count | Root cause                                                          |
| --------------------------------------- | ------------ | ------------------------------------------------------------------- |
| Missing `.strict()` on protocol schemas | ~40-60       | All 21 schemas lack `.strict()`; type inference widens unexpectedly |
| Missing imports / stale type references | ~80-100      | Stale references to removed/moved modules                           |
| `noUncheckedIndexedAccess` violations   | ~50-70       | Indexed access without undefined guard                              |
| Missing `coreMethods` in test fixtures  | ~30-50       | Test fixtures construct partial objects                             |
| Implicit `any` parameters               | ~20-30       | Untyped callback params                                             |
| Other (misc type mismatches)            | ~50-70       | Various                                                             |

**Impact:** Typecheck cannot run in CI as a blocking gate. Real type errors are hidden in the noise.

**Recommended approach:** Fix by category, not by file:

1. Add `.strict()` to all protocol schemas first (may fix 40-60 errors at once)
2. Fix stale imports
3. Extract test fixture factories with `coreMethods`
4. Add explicit guards for `noUncheckedIndexedAccess` violations
5. Type all callbacks

---

## [TQ2] [P1] 24 failing test suites

**Count:** 24 failed suites, 24 failed tests, 446 passed suites, 1465 passed tests. Up from 15 failures in beta review.

| Suite                          | Failure count | Likely cause                      |
| ------------------------------ | ------------: | --------------------------------- |
| `runtime.test.ts`              |             4 | Stale expectations after refactor |
| `addon-handler-bridge.test.ts` |             3 | Missing `.strict()` cascading     |
| `ws-bridge.test.ts`            |             2 | Schema changes not reflected      |
| `http-server.test.ts`          |             2 | Auth changes broke tests          |
| `media-addon.test.ts`          |             2 | Plugin interface drift            |
| `weather-addon.test.ts`        |             1 | API shape changed                 |
| Various small suites           |            10 | Assorted                          |

**Note:** Exact counts estimated from test output. A full `pnpm test --run --reporter=verbose` dump needed for precise breakdown.

**Impact:** Cannot run tests as a CI gate. Regressions land unnoticed.

**Effort:** Medium — each suite needs individual triage. Many failures are likely test-expectation drift from the same refactors that added the 53 new typecheck errors.

---

## [TQ3] [P2] Lint gate OOMs

**Evidence:** `pnpm lint` did not complete — process exhausted memory.

**Impact:** Cannot verify lint rules. Oxlint's boundary-checking rule (forbidding `packages/cli/src/**` → frontend imports) cannot be verified.

**Possible causes:**

1. Large files (`run.ts` 1849 lines, `runtime.test.ts` 1664 lines) exhausting AST memory
2. Oxlint configuration issue (parser, plugins)
3. Machine memory (CI environment with <4GB RAM)

**Investigation:** Run oxlint on individual files to isolate the OOM source. If it's large files, splitting monoliths (see code-smells report) will also fix lint.

---

## [TQ4] [P3] No CI configuration

**Evidence:** No `.github/workflows/` directory. Unchanged from beta review.

**Impact:** No automated enforcement of any quality gate. Every review requires a human to remember to run typecheck, tests, format, and lint.

**Effort:** Low — add a GitHub Actions workflow that runs `pnpm lint`, `pnpm format --check`, `pnpm typecheck`, `pnpm test --run`. But lint OOM and 357 typecheck errors make this impractical until those gates are clean.

---

## [TQ5] [P3] Test coverage excludes SPA, .tsx, most UI

**Evidence:** `vitest.config.ts` — coverage configuration excludes `**/*.tsx` and frontend sources. Unchanged from beta review.

**Impact:** No visibility into frontend coverage. If gesture detection in `Deck.tsx` has bugs, there are no tests to catch them.

**Effort:** Medium — add jsdom test environment for frontend components.

---

## [TQ6] [P4] `ws-integration.test.tsx` is an empty placeholder

**Evidence:** Beta review flagged this. Status unchanged.

**Impact:** WS integration has zero test coverage for the frontend side.

---

## Recommended test fixes sequence

1. **Triage the 24 failures** — run `pnpm test --run --reporter=verbose > test-output.txt`, categorize by root cause.
2. **Fix protocol schemas** (add `.strict()`) — this fixes test failures in `ws-bridge.test.ts`, `addon-handler-bridge.test.ts`, and part of `runtime.test.ts`.
3. **Create test fixture factories** — `createTestDeck()`, `createTestRuntime()` with all required fields, fixing `coreMethods` type errors.
4. **Fix auth-related test drift** — `http-server.test.ts` needs Bearer token in test requests.
5. **Sweep remaining failures** — one PR per category.
6. **Add CI** when all gates are green.
