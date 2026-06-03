---
status: complete
phase: 11-session-config-contracts
source:
  - 11-01-SUMMARY.md
started: 2026-05-17T12:25:00+02:00
updated: 2026-05-17T23:18:59+02:00
---

## Current Test
number: 2
name: implicit fallback uses bundled date-time path
expected: |
  Remove or comment out the top-level `session.locked_deck` entry in a local copy of the fixture, restart the CLI, trigger the same supported lock transition, and confirm the runtime still shows a useful built-in locked fallback with date/time content from the bundled `date-time` button contract.
awaiting: complete

## Tests

### 1. Configured Locked Deck Switching And Exact Unlock Restore
expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli.ts start --config fixtures/phase-11/config.locked-session.yml`. Before any simulated lock event, press key `0` on the main deck to navigate to `Apps`, then press key `0` again to navigate to `Settings`. The visible key at position `0` should read `Session unknown` (or the resolved current session state once live monitor updates exist). Trigger a supported session lock transition through the phase review harness or supported host path. The runtime should replace the normal deck with the configured `locked` deck from `packages/cli/fixtures/phase-11/config.locked-session.yml`, and the visible key should read `Locked on <os>`. Then trigger an unlock transition. The runtime should restore the exact pre-lock path back to `settings`, not dump the user to `main` or `apps`.
fixture: `packages/cli/fixtures/phase-11/config.locked-session.yml`
result: pass
pass_if:
  - The pre-lock path navigates `main -> apps -> settings` using ordinary configured decks.
  - A supported lock transition swaps the visible surface to the configured `locked` deck.
  - The locked deck visibly differs from the normal path and renders the host-aware label.
  - Unlock restores the exact pre-lock navigation state (`settings`) rather than a shallower or arbitrary deck.
fail_if:
  - Lock leaves the user on the previous deck or swaps to a blank/dead surface.
  - Unlock drops the user on `main`, `apps`, or another arbitrary deck after starting from `settings`.
  - The locked deck fails to render its host-aware label.

### 2. Implicit Fallback Exists When No Locked Deck Is Configured
expected: Remove or comment out the top-level `session.locked_deck` entry in a local copy of the fixture and restart the CLI. Trigger the same supported lock transition. The runtime should still show a useful built-in locked fallback with date/time content, and that surface should come from the bundled `date-time` button contract rather than a bespoke runtime-only renderer.
fixture: local copy of `packages/cli/fixtures/phase-11/config.locked-session.yml` without `session.locked_deck`
result: pass
pass_if:
  - Lock still swaps the runtime to a visible fallback surface.
  - The fallback behaves like a date/time display rather than a dead key.
  - The fallback cadence and label formatting match the bundled `date-time` button behavior.
fail_if:
  - Lock produces a blank surface, stale pre-lock deck, or runtime error.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

Manual host lock/unlock review still depends on exercising the GNOME `org.gnome.ScreenSaver` monitor path on a real supported Linux session.
