---
title: fix: Session provider null on Linux + vite esbuild deprecation warnings
date: 2026-07-30
type: fix
status: draft
product_contract_source: ce-plan-bootstrap
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# fix: Session provider null on Linux + vite esbuild deprecation warnings

## Summary

Two unrelated regressions on the current branch, both surfaced as live-runtime noise:

- `createSessionProvider` returns a no-op `null` session provider on Linux because the factory short-circuits when the caller omits `dbus`, even though `createLinuxSessionProvider` already self-owns a `sessionBus()`. `core:lock` therefore never receives lock-state events on machines without a pre-wired dbus (matches the symptom in `docs/solutions/runtime-errors/session-lock-provider-never-fires.md`).
- Dev server logs three deprecation warnings on every restart: `vite:react-babel` still emits `esbuild` and `optimizeDeps.esbuildOptions`. Root cause: `@vitejs/plugin-react@4.7.0` (the v4 Babel-based line); v5+ uses Oxc and drops those options.

The session bug is the regression that broke the lock deck; the vite warnings are noise that masks real ones. Both are small, contained fixes.

## Problem Frame

### Session provider null on Linux

`packages/cli/src/system/providers/session.ts:43-79` is the platform-factory. The Linux branch reads:

```ts
if (platform === "linux") {
  if (options.dbus === undefined) {
    return createNullSessionProvider(options.logger) // <-- short-circuit
  }
  const { createLinuxSessionProvider } = await import("./session/linux")
  return createLinuxSessionProvider({
    dbus: options.dbus,
    logger: options.logger,
    ...(options.idleMs !== undefined ? { idleMs: options.idleMs } : {}),
  })
}
```

`createLinuxSessionProvider` (`session/linux.ts:36-44`) already self-owns a dbus bus when `deps.dbus` is null, mirroring `active-app/wayland-gnome.ts:62-74`. The factory's short-circuit prevents that self-ownership from ever running, so Linux always lands on the no-op null provider.

`packages/cli/src/cli/commands/run.ts:1000-1004` does not inject `dbus`, so on a real Linux run the call resolves to a null provider, `runtime.setSessionProvider(session)` registers `noopUnsubscribe`, and `core:lock` never fires.

The existing test `packages/cli/src/system/providers/session/__tests__/factory.test.ts:44-50` ("delegates to linux provider when dbus is not injected") already encodes the desired behavior and currently fails:

```
AssertionError: expected 'unknown' to be 'unlocked'
```

Fix is one-line: drop the `if (options.dbus === undefined)` guard so the linux branch always delegates.

### Vite `vite:react-babel` warnings

`packages/cli/package.json:69` pins `"@vitejs/plugin-react": "^4.3.4"` (resolved to `4.7.0`). The v4 line still ships `vite:react-babel`, which emits the deprecated options the dev server warns about:

```
[vite] warning: `esbuild` option was specified by "vite:react-babel" plugin.
[vite] warning: `optimizeDeps.esbuildOptions` option was specified by "vite:react-babel" plugin.
```

Per the upstream `vite-plugin-react` v5/v6 changelog (Context7, library `/vitejs/vite-plugin-react`):

- **v5+** swaps Babel for Oxc; stops emitting `esbuild`/`optimizeDeps.esbuildOptions`.
- **v6** removes Babel entirely and removes the `babel` option. Requires Vite 8+ for Oxc-based Refresh; the current Vite 6 is supported but Babel transforms (none configured here) stop working.

No project code passes `babel` to `react()`, so either v5 or v6 works. v6 is leaner and forward-aligned with Vite 8; v5 is the conservative pick. Default to **v6** unless `pnpm typecheck` flags a regression, in which case fall back to `^5`.

## Requirements

- **R1.** On Linux, `createSessionProvider({ platform: "linux", logger })` (no `dbus`) returns the real `createLinuxSessionProvider` result — not the null provider. The session provider exposes a working `subscribe` that emits lock-state transitions when the OS session locks or the user goes idle.
- **R2.** `runtime.setSessionProvider(session)` on Linux produces a non-null provider whose `subscribe` is not `noopUnsubscribe`.
- **R3.** The dev server (`pnpm --filter sirenodeck dev`) starts without printing any `esbuild`/`optimizeDeps.esbuildOptions`/`vite:react-babel` deprecation warnings.
- **R4.** No behavior change for darwin/win32 factory paths; existing factory tests for those platforms continue to pass.
- **R5.** `pnpm lint && pnpm format && pnpm typecheck` and `pnpm test` pass with no new failures. The pre-existing unrelated test failures (e.g. `system-status` formatter tests) are out of scope.

## Key Technical Decisions

- **KTD1 — Drop the Linux `dbus` short-circuit in the factory.** The factory already accepts optional `dbus`; the right owner for self-ownership is `createLinuxSessionProvider`, which does it correctly today. Removing the guard makes the linux path symmetric with the active-app provider (`active-app.ts:51-64`) which also unconditionally delegates to the linux implementation. (session-settled: user-directed — chosen over "thread `dbus` through `run.ts`": the legacy project self-owns in the monitor; aligning to that pattern removes a recurring null-provider footgun.)
- **KTD2 — Upgrade `@vitejs/plugin-react` to `^6.0.0`.** v6 is Babel-free, uses Oxc, and matches the AGENTS.md stack note ("Vite 6, Tailwind 4"). Fallback to `^5.0.0` only if v6 surfaces a runtime regression in `pnpm dev` or `pnpm typecheck`.
- **KTD3 — Do not change `react()` plugin config in `vite.config.ts`.** No Babel options are configured today; v6/v5 are drop-in for our config.

## Scope Boundaries

### In scope

- One-line edit in `packages/cli/src/system/providers/session.ts` (factory linux branch).
- `pnpm.overrides` or version bump on `@vitejs/plugin-react` in `packages/cli/package.json`, plus reinstall.
- Verification via existing factory test, full test run, and `pnpm --filter sirenodeck dev` smoke check.
- A new vitest case in `factory.test.ts` asserting that on Linux without `dbus` the returned provider is **not** the null provider (subscribes are not `noopUnsubscribe`), as called out in the existing solution doc's "Prevention" section.

### Out of scope

- Other providers (`clipboard`, `key-macro`, `notification`, `active-app`). They share the optional-dep pattern but each has its own self-ownership path; an audit is a separate ticket.
- Migrating `pnpm`/`node`/`TypeScript` versions. Already on current versions.
- The pre-existing failing `system-status` formatter tests. Unrelated, not in this PR.
- Switching to `@vitejs/plugin-react-swc` or `@rolldown/plugin-babel`. Plugin v6 covers our needs; SWC adds nothing here, and we have no Babel plugins to keep.

### Deferred to follow-up work

- Audit `clipboard.ts`, `key-macro.ts`, and `notification.ts` factories for the same optional-dep → silent-null trap the session factory had (called out in `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` Prevention §).
- `pnpm dev` warning audit pass for any remaining deprecation messages now that `vite:react-babel` is gone.

## Implementation Units

### U1. Linux session provider delegation

- **Goal**: `createSessionProvider({ platform: "linux", logger })` returns the real `createLinuxSessionProvider` result, not the null provider, so `runtime.setSessionProvider` registers a working listener.
- **Requirements**: R1, R2, R4.
- **Dependencies**: none.
- **Files**:
  - modify: `packages/cli/src/system/providers/session.ts`
  - test: `packages/cli/src/system/providers/session/__tests__/factory.test.ts`
- **Approach**: in the linux branch, drop the `if (options.dbus === undefined) return createNullSessionProvider(...)` guard and let the factory unconditionally delegate to `createLinuxSessionProvider`. Pass `dbus: options.dbus` through unchanged — `createLinuxSessionProvider` already treats `undefined`/`null` as "self-own a bus". Add a regression test asserting the returned provider's `subscribe` is **not** `noopUnsubscribe` (e.g. `subscribe()` returns a callable unsubscribe, and the returned function has stable identity when called twice — covers the null-vs-real boundary).
- **Test scenarios**:
  - linux + no dbus → provider is not the null provider (subscribe returns a function whose `unsubscribe` actually removes the listener).
  - linux + injected dbus → provider still delegates to linux impl (regression).
  - darwin without executor → still returns null provider (regression).
  - win32 without executor → still returns null provider (regression).
- **Verification**: `pnpm test -- packages/cli/src/system/providers/session/__tests__/factory.test.ts` passes; the previously-failing "delegates to linux provider when dbus is not injected" test now goes green.

### U2. Upgrade `@vitejs/plugin-react` to drop `vite:react-babel` warnings

- **Goal**: dev server logs no `esbuild`/`optimizeDeps.esbuildOptions`/`vite:react-babel` deprecation warnings.
- **Requirements**: R3, R5.
- **Dependencies**: none (independent of U1).
- **Files**:
  - modify: `packages/cli/package.json`
  - modify: `pnpm-lock.yaml` (regenerated by install)
  - no code changes
- **Approach**: bump `"@vitejs/plugin-react"` from `"^4.3.4"` to `"^6.0.0"`. `pnpm install`. Verify by running `pnpm --filter sirenodeck dev` for ~10 seconds and checking stderr; the three warnings should be gone. If `pnpm typecheck` fails or the dev server logs new errors, fall back to `"^5.0.0"`. Confirm frontend still HMRs and the `core:lock` deck renders (no behavioral regression from plugin upgrade).
- **Test scenarios**:
  - `pnpm install` completes cleanly; no peer-dep warnings blocking install.
  - `pnpm typecheck` passes.
  - `pnpm dev` logs no `esbuild` / `optimizeDeps.esbuildOptions` / `vite:react-babel` deprecation warnings.
  - Existing frontend test suite (jsdom tests under `packages/cli/frontend/src/**/__tests__`) still passes — plugin v6/v5 must keep React Refresh working under jsdom.
- **Verification**: `pnpm test` (full suite, the same pre-existing unrelated failures are allowed), `pnpm typecheck`, `pnpm --filter sirenodeck dev` smoke.

## System-Wide Impact

- **End users**: `core:lock` deck now actually renders on `runtime:lock-mode` on Linux (the original regression). Dev server log noise drops, making real warnings easier to spot.
- **Developers**: factory test that was previously failing starts passing. Anyone reading the factory can stop wondering why the optional `dbus` argument is even typed as optional on the linux path — it's now correctly documented as "may be omitted to let the linux impl self-own".
- **Operations**: none.
- **Other packages**: only `packages/cli/package.json` changes. `packages/addon-*` and `packages/web` are untouched.

## Risks & Dependencies

- **Risk: plugin v6 changes React Refresh internals.** v6 uses Oxc instead of Babel for refresh transform. Mitigation: `pnpm typecheck` and a `pnpm dev` smoke check. Fallback to v5 if v6 breaks the dev loop.
- **Risk: plugin v6 requires Vite 8+ for some features.** Per Context7 docs, v6's full Oxc-Refresh pipeline expects Vite 8. We are on Vite 6.4.3. If v6 doesn't load cleanly, fall back to `^5.0.0` which is documented as Vite-6-compatible.
- **Risk: U1 fix surfaces a latent dbus bug now that the real linux provider actually runs.** The fix in `session/linux.ts:36-44` uses `sessionBus()` from `dbus-next`; if the runtime environment lacks a session bus (e.g. headless CI), `createLinuxSessionProvider` returns the null provider via the existing `catch` — no crash. Worth a smoke run on the dev machine to confirm.

## Verification Contract

- `pnpm test` shows the previously-failing `createSessionProvider factory > delegates to linux provider when dbus is not injected` test now green.
- `pnpm typecheck` and `pnpm lint` pass.
- `pnpm --filter sirenodeck dev` startup log contains no `vite:react-babel` / `esbuild` / `optimizeDeps.esbuildOptions` warnings.
- Manual: on Linux, `pnpm --filter sirenodeck dev -- --emulator` + `loginctl lock-session` renders `core:lock` on the emulator (per AGENTS.md "Verification" section).

## Definition of Done

- U1 and U2 merged with all new/relevant tests green.
- A short companion `docs/solutions/runtime-errors/` entry (or refresh of the existing `session-lock-provider-never-fires.md`) capturing the factory short-circuit as a re-occurrence pattern, run via `/ce-compound` after the fix lands.
- No new pre-existing test failures introduced (unrelated `system-status` formatter failures may remain).

## Sources & Research

- `docs/solutions/runtime-errors/session-lock-provider-never-fires.md` — original incident; this plan addresses a re-occurrence of the factory-side cause.
- `packages/cli/src/system/providers/session.ts:43-79` — factory (current code short-circuits).
- `packages/cli/src/system/providers/session/linux.ts:36-44` — already self-owns; the bug is the factory never reaches it.
- `packages/cli/src/system/providers/active-app.ts:51-64` — the pattern the fix aligns to (linux branch unconditionally delegates, even if `dbus` is omitted).
- `packages/cli/src/cli/commands/run.ts:998-1013` — orchestrator call site; no edit needed (`dbus` can remain omitted).
- Context7 `/vitejs/vite-plugin-react` CHANGELOG — v5+ Oxc, v6 Babel-free.
- `pnpm-lock.yaml` resolved: `@vitejs/plugin-react@4.7.0`; `vite@6.4.3`.
