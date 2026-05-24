---
status: complete
phase: 20-theme-packages-and-locked-time-layout
source:
  - 20-01-PLAN.md
  - 20-02-PLAN.md
  - 20-03-PLAN.md
started: 2026-05-23T23:43:00+02:00
updated: 2026-05-24T12:58:52+02:00
---

# Phase 20 UAT — Theme Packages, Shared Asset Pipeline, and Locked Time Layout

## Current Test
number: 2
name: Shared theme/addon asset pipeline on the browser path
expected: |
  Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.asset-pipeline.yml`.
  The manifest-backed theme should inject packaged CSS/font assets into the browser host, the emoji selector deck and category buttons should render shipped addon icons through the shared asset pipeline, builtin refs such as `builtin://core-buttons/clock.svg` and addon refs such as `addon://emoji-selector/favorites.svg` should both resolve, and breaking a referenced asset path should fail clearly during config/theme loading rather than silently degrading.
awaiting: complete

## Fixture 1 — Theme package frame chrome on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.theme-package-frame.yml`
fixture: `packages/cli/fixtures/phase-20/config.theme-package-frame.yml`
pass_if:
- The framed action buttons visibly render through browser-backed HTML/CSS with package-backed `buttonFrame` chrome rather than the old hardcoded core frame path.
- The analog clock and calendar sheet remain visibly `full_surface` surfaces and do not pick up the framed wrapper chrome.
- Editing the fixture from `theme: dark` to `theme: light` hot-reloads to a visibly different package-backed frame treatment and typography without stale pixels.
- Browser rendering still respects the `full_surface` escape hatch while framed buttons use the resolved theme runtime export.
fail_if:
- Framed buttons still appear to use only one fixed core frame regardless of the resolved theme package.
- `full_surface` surfaces such as the analog clock or calendar sheet get wrapped in the package frame.
- Changing `theme: dark` to `theme: light` does not visibly change frame chrome or leaves stale browser-rendered content behind.
result: pass
reported: "pass"

## Fixture 3 — Implicit locked fallback centered `HH:MM` row

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.locked-time-layout.yml`
fixture: `packages/cli/fixtures/phase-20/config.locked-time-layout.yml`
pass_if:
- The fixture renders normally on `main`, allows navigation to `review`, and omits any explicit `session.locked_deck` override.
- A supported lock transition replaces the current deck with the implicit fallback row on buttons `5..9` only, visibly arranged as `[H][H][:][M][M]` with the colon on button `7`.
- The fallback remains live on the shipped path, advancing as real time changes instead of freezing as a one-time snapshot.
- Unlock restores the exact pre-lock `review` deck rather than resetting to `main` or another shallower surface.
- If a local copy adds `session.locked_deck` (or the reviewer reruns the Phase 11 locked-session fixture), the configured locked deck still overrides the implicit fallback.
fail_if:
- Lock mode still shows the old single date-time button or renders the implicit fallback anywhere other than buttons `5..9`.
- The colon is not isolated on the center button, the row is visually misordered, or the time freezes after lock.
- Unlock drops the session onto `main`, leaves the implicit fallback visible, or otherwise loses the exact pre-lock navigation stack.
- Adding an explicit `session.locked_deck` still shows the implicit fallback row instead of the configured locked deck.
result: pass
reported: "pass"

## Fixture 2 — Shared theme/addon asset pipeline on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.asset-pipeline.yml`
fixture: `packages/cli/fixtures/phase-20/config.asset-pipeline.yml`
pass_if:
- The manifest-backed theme injects packaged CSS/font assets into the browser host and the framed buttons still render correctly.
- The emoji selector deck and category buttons render shipped addon icons through the shared asset pipeline rather than raw unresolved references or missing-image placeholders.
- Builtin asset references such as `builtin://core-buttons/clock.svg` and addon asset references such as `addon://emoji-selector/favorites.svg` both resolve on the shipped browser path.
- Breaking a referenced asset path fails clearly during config/theme loading rather than silently degrading on-device.
fail_if:
- Theme stylesheet assets are not injected into the browser document or packaged font references are ignored.
- Emoji selector icons disappear, render as unresolved `addon://...` strings, or only work through one-off widget-local handling.
- The browser path resolves builtin assets but not addon assets, or vice versa.
- Broken asset paths degrade silently instead of failing with a path-aware error.
result: issue
reported: "I only see a quare instead of the imagess"
severity: major

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "The emoji selector deck and category buttons render shipped addon icons through the shared asset pipeline rather than raw unresolved references or missing-image placeholders."
  status: failed
  reason: "User reported: I only see a quare instead of the imagess. After the gap-closure rerun, the real browser/device path still shows the square plus a broken-image icon. The reported resolved paths are also wrong: `builtin://core-buttons/clock.svg` resolves to `packages/cli/src/builtin-addons/assets/clock.svg` instead of `packages/cli/src/builtin-addons/core-buttons/assets/clock.svg`, and addon asset paths likewise drop the addon folder segment."
  severity: major
  test: 2
  closure_plan: "20-06-PLAN.md"
  root_cause: "`20-05` fixed the browser capture seam, but human verification exposed a deeper shared-asset registration bug: built-in addon asset definitions themselves were resolving from the wrong directory. For example, `packages/cli/src/builtin-addons/core-buttons/index.ts` built `clock.svg` from `new URL('../assets/clock.svg', import.meta.url)`, which pointed to `packages/cli/src/builtin-addons/assets/clock.svg` instead of the addon-local `packages/cli/src/builtin-addons/core-buttons/assets/clock.svg`. `20-06` corrects those built-in addon asset declarations to `./assets/...` and adds focused resolver coverage so the addon folder segment is asserted before browser rendering begins."
  affected_files:
    - packages/cli/src/builtin-addons/core-buttons/index.ts
    - packages/cli/src/builtin-addons/emoji-selector/index.ts
    - packages/cli/src/addon/registry.ts
    - packages/cli/src/addon/registry.test.ts
    - packages/cli/src/config/loader.test.ts
  rerun_fixture: "packages/cli/fixtures/phase-20/config.asset-pipeline.yml"
  rerun_result: "Failed after 20-05: the real browser/device path still shows the square and the broken image icon, and the reported resolved asset paths are missing the addon folder segment. After 20-06, rerun the same fixture on the shipped browser/device path to confirm the corrected addon-local asset registrations now render the images correctly."
