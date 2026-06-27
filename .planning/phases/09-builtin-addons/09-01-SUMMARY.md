# Plan 09-01 Summary

**Completed:** 2026-06-27

## What was built

Shipped three built-in addons (`date-time`, `value-display`, `system-status`) covering 8 button types: `core:date-time`, `core:time`, `core:date`, `core:clock`, `core:analog-clock`, `core:locked-time-tile`, `core:value-display`, `core:system-status`. All register through `packages/cli/src/builtin-addons/register-builtins.ts` and validate the user's `config.yml` end-to-end.

The 8 button types render in the emulator via the shared `Deck` + `ButtonFrame` components; the button surfaces themselves are still type-name labels in the frontend (real addon frontend rendering is the next roadmap phase, see `12-addon-frontend-registry`).

## Key files

- `packages/cli/src/builtin-addons/date-time/`: `schemas.ts` (6 zod schemas), `format.ts` (Intl-based `formatDigitalDateTimeLabel` with `<markup>` tag passthrough), `buttons/index.tsx` (6 button render functions using `useNow(intervalMs)`), `index.ts` (addon + named exports)
- `packages/cli/src/builtin-addons/value-display/`: `schemas.ts` (`ValueDisplayButtonSchema` with `values: [{ label, command, formatter?, units?, timeout_ms?, icon? }]`), `buttons/value-display.tsx`, `domain/` (command executor polling)
- `packages/cli/src/builtin-addons/system-status/`: `schemas.ts` (`SystemStatusButtonSchema` with `metrics[]` + `variant: 'text' | 'bars'`), `buttons/system-status.tsx` (renders `<Bars>` or `<LabelValueList>` from Phase 08), `domain/metrics.ts` (`refreshMetrics` reading `os.cpus()`, `os.totalmem()`, `os.freemem()`, `os.loadavg()`, Linux `/sys/class/power_supply/BAT0/capacity` best-effort)
- `packages/cli/src/builtin-addons/register-builtins.ts`: imports + registers `dateTimeAddon`, `valueDisplayAddon`, `systemStatusAddon`
- `packages/cli/src/builtin-addons/index.ts`: re-exports the 3 addons

## Decisions made

- **Single `buttons/index.tsx` file** for the 6 date-time buttons (instead of one file per button as the plan suggested). The 6 buttons share a tiny `useNow(intervalMs)` hook + `formatDigitalDateTimeLabel` helper, so co-locating them in one file is more readable than 6 separate files. Tests live in `date-time/__tests__/`.
- **Renderer-only addons**: each button has a `render` function but no `onTap`/`onDblTap`/`onHold` actions in the default case. `core:action` (Phase 03) still handles user-driven execution.
- **System-status metrics**: poll via `setInterval(poll_interval_ms ?? 1000)`; metrics map is best-effort and gracefully degrades to "N/A" on Linux when `/sys/class/power_supply/BAT0` is missing.

## Notes for downstream

- The `render` functions for these buttons are only invoked by the **CLI host** (e.g. for hardware key images via Playwright). The emulator/frontend currently shows the button **type** as a label fallback (commit `5a2c40f`) because the addon frontend registry is not yet implemented.
- For real button surfaces in the emulator (clock face, weather widget, system bars), see phase 12 (`.planning/phases/12-addon-frontend-registry/12-PHASE.md`).

## Tests

- `pnpm test` — 409 passing (combined with plans 09-02 + 04-frontend work).
- The 8 button types register cleanly and `config.yml` validation accepts them.
