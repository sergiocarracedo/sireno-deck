# Sireno Deck — Beta Review

**Review date:** 2026-07-29
**Scope:** full repository (`packages/cli`, `packages/addons/app-shortcuts`)
**Reviewer mode:** senior engineer + OSS-impression lens
**Mode:** report only; no fixes

---

## Verdict

**Not beta-ready.** Roughly 12 P0 issues must ship before any release, the most damaging of which break the production build path, the auth chain, and the cross-process boundary contract.

---

## Priority counts

| Priority | Count | Meaning                            |
| -------- | ----: | ---------------------------------- |
| P0       |    12 | Must fix to ship                   |
| P1       |    22 | Must fix in next patch             |
| P2       |    30 | Quality (ship-block only if cheap) |
| P3       |    18 | Nice-to-have                       |
| P4       |    12 | Nit                                |

Totals approximate; see per-area files for individual findings.

---

## Top blockers (P0)

| #   | Area             | Title                                                                | Evidence                                                             |
| --- | ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | foundation       | `pnpm build` is a no-op; SPAs never build                            | `packages/cli/package.json:35`; `assetsInclude` in both Vite configs |
| 2   | foundation       | No CI configuration exists                                           | No `.github/workflows/`                                              |
| 3   | foundation       | Token not enforced in production WS bridge                           | `cli/commands/run.ts:1241`                                           |
| 4   | foundation       | Token not propagated to Vite children                                | `cli/commands/emulator-mode.ts`                                      |
| 5   | foundation       | `packages/cli/src/index.ts` violates process boundary                | `packages/cli/src/index.ts:31-35`                                    |
| 6   | foundation       | Version constants contradict each other                              | `version.ts` vs `addon/api-types.ts` vs `api/protocol-internal.ts`   |
| 7   | foundation       | `service-manager.ts` imports a non-existent module                   | `cli/commands/service-manager.ts:64`                                 |
| 8   | architecture     | `core:next-page` declared but has no handler                         | `deck/system-buttons/types.ts:5`                                     |
| 9   | architecture     | Hot-reload leaks old addon services                                  | `addon-handler-bridge.ts:62`                                         |
| 10  | system-providers | `hyper+super+a` causes stuck keys on Linux                           | `key-macro/linux.ts:325-374`                                         |
| 11  | system-providers | Windows key-macro DLL cache has no version check                     | `key-macro/windows.ts:19, 277-283`                                   |
| 12  | system-providers | Linux session provider misses locked-at-startup                      | `session/linux.ts:48-69`                                             |
| 13  | system-providers | D-Bus proxy leak in Linux session provider                           | `session/linux.ts:96-114`                                            |
| 14  | system-providers | `isPureAscii` regex matches control characters                       | `key-macro/linux.ts:427`                                             |
| 15  | security         | WS bridge does not enforce the token in production                   | `cli/commands/run.ts:1241`                                           |
| 16  | security         | HTTP server exposes raw config without auth                          | `cli/http-server.ts`                                                 |
| 17  | security         | `validateAndLoadConfig` reads YAML from disk via cwd override        | `cwd.ts`                                                             |
| 18  | security         | PID file identity not verified                                       | `util/daemon.ts`                                                     |
| 19  | security         | Service log race between parent + child                              | `spawn-daemon.ts:124-152`                                            |
| 20  | frontend-ui      | `Text.test.tsx` is red                                               | `Text.tsx` vs test                                                   |
| 21  | frontend-ui      | `ws-integration.test.tsx` is empty placeholder                       | `frontend/src/__tests__/ws-integration.test.tsx`                     |
| 22  | frontend-ui      | Frontend `Deck.tsx` missing `addonName` in addon props               | `Deck.tsx:283-289`                                                   |
| 23  | frontend-ui      | Frontend `Deck.tsx` passes pointer handlers that `ButtonFrame` drops | `Deck.tsx`                                                           |
| 24  | frontend-ui      | Manual dbl-click in `Deck.tsx` emits `tap` then `dbl-tap`            | same                                                                 |
| 25  | frontend-ui      | Both `App.tsx` files re-render every 250ms unconditionally           | `frontend/App.tsx` + `emulator/App.tsx`                              |
| 26  | addon-ecosystem  | `test-buildin/` addon has no manifest, no README, is registered      | `register-builtins.ts`                                               |
| 27  | addon-ecosystem  | Addon READMEs use stale `core:*` names                               | most addon READMEs                                                   |
| 28  | addon-ecosystem  | `media/README.md` calls addon `media-player`, actual is `media`      | `media/README.md`                                                    |
| 29  | testing-quality  | 15 tests failing across 24 suites                                    | `pnpm test` output                                                   |
| 30  | testing-quality  | `pnpm typecheck` ~304 diagnostics                                    | `pnpm typecheck` output                                              |
| 31  | testing-quality  | `pnpm lint` fails (4 errors)                                         | `pnpm lint` output                                                   |
| 32  | testing-quality  | Coverage excludes SPA, .tsx, most UI                                 | `vitest.config.ts`                                                   |
| 33  | docs-oss         | No `LICENSE` at repository root                                      | absent                                                               |
| 34  | docs-oss         | `README.md` references wrong package name                            | `pnpm --filter sireno-deck`                                          |
| 35  | docs-oss         | `README.md` button-type examples are obsolete                        | `core:*` references                                                  |

(The top blockers table above is the full P0 list, 35 items.)

---

## Table of contents

| File                                                         | Scope                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [`01-foundation.md`](01-foundation.md)                       | Repo baseline, build/CI, version drift, tsconfig/lint/format, daemon lifecycle, PID/token    |
| [`02-architecture.md`](02-architecture.md)                   | Runtime, deck methods, addon-handler-bridge, gesture state machine, WS bridge, protocol      |
| [`03-system-providers.md`](03-system-providers.md)           | Linux/macOS/Windows providers, requirements probe, shared helpers, null-provider trap        |
| [`04-security.md`](04-security.md)                           | All trust-boundary surfaces (S1–S14)                                                         |
| [`05-frontend-ui.md`](05-frontend-ui.md)                     | Frontend SPA, emulator SPA, shared UI library, theme overrides, accessibility                |
| [`06-addon-ecosystem.md`](06-addon-ecosystem.md)             | Builtin addon patterns, addon loader, registry, third-party addon, addon README drift        |
| [`07-testing-and-quality.md`](07-testing-and-quality.md)     | Test inventory, failing tests, typecheck/lint/format gates, missing CI, coverage blind spots |
| [`08-documentation-and-oss.md`](08-documentation-and-oss.md) | README/ARCHITECTURE/AGENTS/MIGRATION-NOTES drift, missing files, OSS-impression lens         |

---

## OSS impression — first 5 minutes

A reviewer doing the standard OSS survey would see:

1. **No LICENSE.** First file looked for; missing.
2. **Red CI badge.** No CI, but 15 failing tests + 304 typecheck errors + 4 lint errors locally — visible immediately.
3. **`pnpm build` does nothing.** Returns success, emits no dist. README implies a binary.
4. **README claims a working CLI** with `core:*` button types; actual code uses `date-time:*`, `weather:*`, etc.
5. **Boundary violation:** `packages/cli/src/index.ts` imports frontend code; oxlint's own rule catches it.
6. **Two formatter configs** with conflicting rules.
7. **Stale docs** across addon READMEs, ARCHITECTURE, MIGRATION-NOTES.

The "is this safe to depend on?" question is answered negatively within 5 minutes.

---

## Architectural strengths to preserve

- **Strict TypeScript with `noUncheckedIndexedAccess`.**
- **Zod schemas for protocol and config** with `.strict()` intent.
- **Dependency injection for OS providers**, Playwright, command execution, device selection.
- **Per-button error surfaces** instead of daemon-wide startup failure.
- **Colocated `__tests__/` directories.**
- **Local-only binding** (`127.0.0.1`).
- **Recent docs/solutions learnings** with structured frontmatter — the strongest documentation pattern in the project.
- **Good addon test coverage** for several builtin addons (system-status, weather, media).

---

## Recommended sequence (ponytail-minimal)

1. **Land the boundary/build/version fixes** (P0 foundation #5, #6, #7, #1).
2. **Wire the token** end-to-end (P0 foundation #3, #4; P0 security #1, #2).
3. **Add CI** with the same gates (P0 foundation #2).
4. **Fix the 15 failing tests** in one batched PR.
5. **Sweep `pnpm typecheck`** in one PR per category.
6. **Extract the cross-cutting helpers** (P2 system-providers #13–#18) — these are mechanical and reduce risk for everyone.
7. **Reconcile addon READMEs** with current namespaces.
8. **Add OSS basics**: LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates.

Each step is one or two PRs. None requires new abstractions; all use what's already in the codebase.

---

## Open questions for the developer

These are unresolved without direct input from the project owner:

1. **What is the canonical addon API version?** (1 in code, 3 in `version.ts`.) — recommendation: pick 1, delete the other.
2. **Is `core:next-page` intentional** or dead code? — recommendation: implement it; the type is in `SYSTEM_BUTTON_TYPES`.
3. **What is the OS support matrix for beta?** Strategy mentions Windows; service-manager doesn't. — recommendation: ship Linux + macOS, defer Windows to 0.2.
4. **Is `SIRENO_CWD` override intended** as a power-user feature? — recommendation: gate behind an explicit env flag.
5. **Is hot-reload expected to call `onUnmount`?** — recommendation: yes, treat it as a lifecycle event.
6. **What is the distribution channel for beta?** (npm? GitHub binary? Homebrew?) — recommendation: GitHub Releases with a `pkg` binary for the daemon.
7. **Is the in-source 130-line C# string in `key-macro/windows.ts` a known compromise?** — recommendation: extract to a `.cs` file before beta.
8. **Does the addon `defaults` mechanism need to survive addon-wide opaque config?** — recommendation: yes, document the explicit carve-out.

---

## What is intentionally out of scope

- **Performance benchmarking** (only smells were identified; no profiling was run).
- **Security audit** beyond the 14 trust-boundary surfaces enumerated; no SAST/DAST ran.
- **Localization / i18n** (project is English-only; no localization scope claimed).
- **Accessibility audit** beyond the React baseline (`role`, `aria-*`); no screen-reader testing.
- **Real-hardware testing** (no Stream Deck available in this review).

These are listed so a follow-up reviewer knows what's not covered.

---

## How to use this report

- Read the P0 list top-down. Each P0 is small enough to be one PR.
- Use the per-area files for the full evidence trail.
- The P2 cross-cutting extractions are mechanical and worth doing before the file size grows further.
- The P4 list is for a polish pass; do not block on it.

The codebase has good bones. The blockers are sharp but narrow; the cleanups are mechanical; the documentation gaps are visible. A focused sprint of one week can land the P0 list; another week on P1/P2 gets to a credible beta.
