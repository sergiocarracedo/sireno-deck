# Sireno Deck — Pre-Release Review

**Review date:** 2026-08-06
**Scope:** full repository (post-beta-review fixes)
**Reviewer mode:** staff engineer + OSS-impression lens
**Mode:** report only; no fixes

---

## Verdict

**Not release-ready.** The token auth chain is still broken (P0 from beta review unanswered). Protocol schemas lack `.strict()`. `sendToCaller` broadcasts method-call results to every connected client. The frontend SPA implements gesture detection — contradicting the architecture doc. Quality gates are worse than the beta review: 357 typecheck errors (was 304), 24 failing tests (was 15). The lint gate still OOMs.

---

## Priority counts

| Priority | Count | Meaning                            |
| -------- | ----: | ---------------------------------- |
| P0       |     3 | Must fix to ship                   |
| P1       |     5 | Must fix in next patch             |
| P2       |     7 | Quality (ship-block only if cheap) |
| P3       |     6 | Nice-to-have                       |
| P4       |     3 | Nit                                |

Totals approximate; see per-area files for individual findings.

---

## Top blockers (P0)

| #   | Area         | Title                                                            | Evidence                                 |
| --- | ------------ | ---------------------------------------------------------------- | ---------------------------------------- |
| 1   | security     | Token not enforced in production WS bridge                       | `run.ts:1401`                            |
| 2   | security     | `sendToCaller` broadcasts method-call results to all clients     | `ws-bridge.ts:249-254`                   |
| 3   | architecture | Frontend Deck.tsx gesture detection contradicts architecture doc | `Deck.tsx:142-218` vs ARCHITECTURE.md §2 |

---

## What improved since beta review

- **HTTP server Bearer token** (`http-server.ts:133-151`): `/api/*` routes now enforce `Authorization: Bearer <token>`. Beta review P0 security #2 fixed.
- **WS bridge addon inventory**: Addon inventory now rides over the WS bridge in emulator mode instead of separate HTTP fetch. Beta review architecture P1 fixed.
- **Format gate**: passes cleanly.

---

## What regressed since beta review

| Metric           | Beta review (Jul 29)  | Pre-release (Aug 6)   | Delta     |
| ---------------- | --------------------- | --------------------- | --------- |
| Typecheck errors | ~304                  | 357                   | +53 worse |
| Failing tests    | 15 (across 24 suites) | 24 (across 24 suites) | +9 worse  |
| Lint             | 4 errors              | OOM (inconclusive)    | worse     |

---

## What is unchanged since beta review (still broken)

- Token chain not wired end-to-end (P0)
- Protocol schemas lack `.strict()` (P1)
- `sendToCaller` broadcasts to all (P0 privacy bug)
- `npm install` for addons not pinned to lockfile (P2)
- PID file identity not verified (P3)
- `run.ts` monolithic at 1849 lines (P2)
- `runtime.test.ts` monolithic at 1664 lines (P3)
- 357 typecheck errors (P1)
- 24 failing tests (P1)

---

## Table of contents

| File                                             | Scope                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [`01-security.md`](01-security.md)               | Token chain, sendToCaller leak, protocol schema strictness, addon loader trust                       |
| [`02-code-smells.md`](02-code-smells.md)         | run.ts monolith, Deck.tsx gesture detection, .strict() absence, sendToCaller name, test monolith     |
| [`03-performance.md`](03-performance.md)         | 250ms re-render loops, gesture detection timers, lint OOM                                            |
| [`04-architecture.md`](04-architecture.md)       | Monolithic run.ts, gesture detection vs architecture doc, sendToCaller broadcast, boundary violation |
| [`05-testing-quality.md`](05-testing-quality.md) | 357 typecheck errors, 24 failing tests, lint OOM, large test files                                   |

---

## OSS impression — first 5 minutes

1. **No LICENSE** (unchanged from beta review).
2. **357 typecheck errors, 24 failing tests** — immediate red flag.
3. **Token not enforced in production** — the WS bridge accepts any message without auth. A reviewer asking "is this safe to connect to?" gets a "no."
4. **`sendToCaller` broadcasts to all** — method-call results leak to every client. Privacy/security red flag visible in first code read of `ws-bridge.ts`.
5. **Frontend gesture detection contradicts architecture doc** — a reviewer who reads the ARCHITECTURE.md then opens `Deck.tsx` will find the doc is wrong about the SPA being "pure display."

---

## Recommended sequence (ponytail-minimal)

1. **Wire the token** end-to-end: pass `expectedToken` to `startWsBridge` in `run.ts:1401` (one-line fix).
2. **Fix `sendToCaller`** to filter by client (single function body change).
3. **Add `.strict()`** to all 21 protocol schemas (mechanical, one file).
4. **Fix failing tests** (24 failures). Investigate root causes per suite.
5. **Sweep typecheck errors** by category — many are missing `.strict()` side effects and stale imports.
6. **Break up `run.ts`** into pipeline stages (`pipeline/preflight.ts`, `pipeline/start-providers.ts`, etc.).
7. **Resolve Deck.tsx gesture detection** — either remove the manual detection (if emulator-mode only) or update ARCHITECTURE.md.

---

## Open questions

1. **Is frontend gesture detection intentional for emulator mode?** If yes, ARCHITECTURE.md must be updated. If no, delete it and route through the bridge.
2. **Is the lint OOM reproducible or CI-specific?** Needs investigation on a machine with ≥8GB RAM.
3. **What is the target typecheck error count for release?** Zero would be ideal; if some are structural (e.g. `noUncheckedIndexedAccess` from test fixtures), document the acceptable baseline.
4. **Is `packages/cli/src/index.ts` still importing frontend code?** (lint OOM'd, could not confirm boundary violation integrity.)

---

## What is intentionally out of scope

- **Performance benchmarking** — no profiling ran; only visible smells flagged.
- **Real-hardware testing** — no Stream Deck available.
- **Addon ecosystem deep review** — only loader trust boundary checked; individual addons not audited.
- **Windows platform review** — key-macro DLL cache logic not re-examined.
- **Accessibility audit** — not in scope.
- **i18n / localization** — not in scope.
