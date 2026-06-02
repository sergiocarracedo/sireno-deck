# Quick Task 027 Summary

**Task:** I want to use full instead of 'full_surface'
**Completed:** 2026-06-02

## What was done
Renamed the public button-surface contract from `full_surface` to `full` across the active config, runtime, hosted-render, and shipped fixture seams. The emitted DOM marker stayed `data-sireno-full-surface`, and focused regressions were updated to prove the renamed authored contract without breaking the existing browser-facing HTML assertions.

## Files changed
- `packages/cli/src/core/schemas.ts`: renamed the core button envelope field and schema key from `full_surface` to `full`.
- `packages/cli/src/deck/runtime.ts`: carried `full` through runtime render props, hosted-button transport, and shared runtime error surfaces.
- `packages/cli/src/render/dom-host-button.tsx`: forwarded authored `full` into `ButtonSurface` and skipped frame wrapping when `full` is set.
- `packages/cli/src/cli/commands/start.ts`: forwarded `full` into hosted browser render props.
- `packages/cli/src/addon/api.ts`: aligned the public addon envelope and `ButtonSurface` prop handling on `full` while keeping `data-sireno-full-surface` output stable.
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`: restored the analog clock surface to an explicit full-surface authored contract.
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`: switched the built-in button to `full`.
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx`: switched the built-in button to `full`.
- `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx`: updated the JSX authoring example to `full`.
- `packages/cli/fixtures/phase-17/config.wrapper-compatibility.yml`: updated fixture config to `full: true`.
- `packages/cli/fixtures/phase-18/config.dom-frame-defaults.yml`: updated fixture config to `full: true`.
- `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`: updated fixture config to `full: true`.
- `packages/cli/src/config/loader.test.ts`: updated focused loader coverage to assert `full`.
- `packages/cli/src/deck/runtime.test.ts`: updated focused runtime coverage to assert `full`.
- `packages/cli/src/render/dom-host.test.tsx`: kept the hosted DOM assertions on `data-sireno-full-surface` and re-synced stale theme output expectations with the live render contract.
- `CHANGELOG.md`: recorded the contract rename and the lesson about keeping one canonical name per runtime concept.

## Commit
`d120a29`
