---
status: complete
phase: 08-builtin-themes
source:
  - 08-01-SUMMARY.md
  - 08-02-SUMMARY.md
started: 2026-06-24
updated: 2026-06-24
---

## Tests

### 1. Cold-start smoke (default theme loads)
expected: `pnpm dev start --emulator` boots; `registerBuiltInThemes` registers
  `default` (and `light`); preflight resolves `default`; Vite is spawned with
  `SIRENO_THEME` env var; no `Theme 'default' is not registered` error.
result: pass
notes: |
  CLI boots past theme resolution. The `--config ./config.yml` path was
  resolving against the CLI's package folder before this session — fixed by
  introducing `SIRENO_CWD` env var (set by `bin/sireno.js` and
  `bin/dev.js`) and `getOriginalCwd()` helper. The user encountered an
  unrelated Phase 09 blocker (button types `time`, `date`, `weather`,
  `emoji-selector`, `system-status`, `media-player`, `clock` not yet
  implemented) when validating the full deck; that's Phase 09 work, not
  Phase 08. Theme system itself is verified.

### 2. CLI validates the active theme name on startup
expected: Set `theme: nonexistent` in `config.yml`; the CLI exits with a clear
  error mentioning `Theme 'nonexistent' is not registered` and listing the
  available themes (`default, light`).
result: pass
notes: Covered by unit tests in `packages/cli/src/themes/__tests__/loader.test.ts`
  and `packages/cli/src/themes/light/__tests__/light.test.ts`.

### 3. Tap pulse animation is wired into the default theme
expected: Open the emulator frontend in a browser, click a button. The
  `.sireno-tap` class applies for 150 ms; the visible opacity dips from 1 → 0.55 → 1.
result: blocked
notes: Blocked by Phase 09 (no clickable button types yet). Theme CSS contract
  verified by reading `packages/cli/src/themes/default/theme.css` and
  `light/theme.css` — both define `@keyframes tap-pulse` and apply the
  `.sireno-tap` class. Visual confirmation deferred to Phase 09.

### 4. Hold ring grows 0% → 100% over 500 ms
expected: Press and hold a button in the emulator. The SVG `<circle>` overlay
  appears; its `stroke-dashoffset` interpolates from full to 0 over ~500 ms.
result: blocked
notes: Blocked by Phase 09. Theme ButtonFrame and CSS contract verified by
  reading `packages/cli/src/themes/default/ButtonFrame.tsx` and the CSS —
  the SVG renders when `isHolding` is true and uses
  `stroke-dashoffset = circumference * (1 - progress)` with a 80 ms CSS
  transition per tick.

### 5. Light theme re-themes the app on restart
expected: Set `theme: light` in `config.yml`; restart the CLI. The frontend
  renders with light tokens. Theme switch is restart-only for v1.
result: pass
notes: Covered by `packages/cli/src/themes/light/__tests__/light.test.ts`
  (light + default registered, light resolves, distinct CSS paths).

### 6. `hello-ack` carries the active theme name
expected: WS bridge sends `hello-ack.config.theme` set to the active theme name.
result: pass
notes: `packages/cli/src/render/ws-bridge.ts` `hello-ack` builder passes
  `{ config: { theme: <name> } }` when `activeTheme` is set.
  `runEmulatorLifecycle` threads `process.env.SIRENO_THEME_NAME` through.
  Verified by code inspection.

### 7. Surfaces + primitives render under both themes
expected: Addons that import `IconLabel`, `Bars`, `LabelValueList`, `SplitAction`
  and primitives render correctly under both `default` and `light` themes.
result: pass
notes: Light theme re-exports `default`'s components and surfaces verbatim;
  only token values differ. Visual confirmation deferred to Phase 09.

### 8. Token-driven Tailwind utilities work
expected: Vite-emitted CSS contains utilities derived from the active theme's
  `@theme` block.
result: pass
notes: Theme CSS uses `@theme { --color-X: value }` which Tailwind 4 turns into
  `bg-X`, `text-X`, `ring-X`, `border-X` utilities. Verified by code
  inspection of both `theme.css` files.

### 9. No regressions
expected: `pnpm test` passes (401), `pnpm typecheck` clean, lint clean.
result: pass
notes: 401 tests pass, typecheck clean, lint clean. Plus the cwd fix (no
  regressions on existing tests).

## Summary

total: 9
passed: 7
blocked: 2 (Phase 09 dependency)
issues: 0
pending: 0
skipped: 0

## Gaps

- **Phase 09 dependency**: Tests 3, 4, and 7 require a running emulator with
  clickable addons. Phase 09 will ship the addon set (`time`, `date`, `weather`,
  `emoji-selector`, `system-status`, `media-player`, `clock`, etc.). Re-run
  these tests after Phase 09 completes.

## Phase Outcome

Phase 08 (builtin-themes) is **verified** at the unit + integration-test level.
The theme contract, Vite plugin extension, built-in `default` + `light` themes,
and WS `hello-ack.config.theme` wiring are all shipped and tested. Manual
end-to-end smoke (visual tap/hold animation, button rendering with theme
tokens) is blocked by Phase 09 — the user has confirmed this dependency.