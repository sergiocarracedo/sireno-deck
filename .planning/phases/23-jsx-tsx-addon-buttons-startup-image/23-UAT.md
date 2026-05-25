---
status: complete
phase: 23-jsx-tsx-addon-buttons-startup-image
source:
  - 23-01-SUMMARY.md
  - 23-02-SUMMARY.md
started: 2026-05-25T20:17:37+02:00
updated: 2026-05-25T20:34:56+02:00
---

## Current Test
number: 4
name: UAT complete
expected: |
  Phase 23 manual UAT is complete.
awaiting: none

## Tests

### 1. Local Raw TSX Addon Startup Test
expected: Start Sireno with a config that points at `packages/cli/fixtures/phase-23/local-raw-addon/` as a local addon. The process should load successfully without a prebuild step, without any `./jsx` import surface, and the raw addon should register/render through the normal startup path.
result: issue
reported: "i used this config file: /works/opensource/sireno-deck/packages/cli/fixtures/phase-23/config.yml And i get the error: pnpm exec tsx packages/cli/src/cli/index.ts start --config packages/cli/fixtures/phase-23/config.yml config error file: packages/cli/fixtures/phase-23/config.yml line: 10 problem: Unknown button type 'phase-23-local-raw-addon' suggestion: Register 'phase-23-local-raw-addon' before using it in config.yml. Tip: Check your config.yml at packages/cli/fixtures/phase-23/config.yml."
severity: blocker

### 2. Hardware Startup Placeholder Handoff Test
expected: Start Sireno on physical Stream Deck hardware with browser startup intentionally slowed enough to observe boot. A branded `SIRENO / STARTING` placeholder should appear immediately on the hardware, then disappear as soon as the first real browser-backed deck render arrives.
result: pass

### 3. Hardware Startup Failure Cleanup Test
expected: Trigger a browser-start or first-render failure during physical-device startup. The temporary startup placeholder should clear from the hardware instead of remaining as a fake-ready screen, and the underlying startup failure should still surface honestly.
result: pass

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Start Sireno with a config that points at `packages/cli/fixtures/phase-23/local-raw-addon/` as a local addon. The process should load successfully without a prebuild step, without any `./jsx` import surface, and the raw addon should register/render through the normal startup path."
  status: failed
  reason: "User reported: i used this config file: /works/opensource/sireno-deck/packages/cli/fixtures/phase-23/config.yml And i get the error: pnpm exec tsx packages/cli/src/cli/index.ts start --config packages/cli/fixtures/phase-23/config.yml config error file: packages/cli/fixtures/phase-23/config.yml line: 10 problem: Unknown button type 'phase-23-local-raw-addon' suggestion: Register 'phase-23-local-raw-addon' before using it in config.yml. Tip: Check your config.yml at packages/cli/fixtures/phase-23/config.yml."
  severity: blocker
  test: 1
