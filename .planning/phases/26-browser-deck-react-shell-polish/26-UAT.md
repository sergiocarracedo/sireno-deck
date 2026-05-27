---
status: complete
phase: 26-browser-deck-react-shell-polish
source:
  - 26-01-SUMMARY.md
  - 26-02-SUMMARY.md
  - 26-03-SUMMARY.md
started: 2026-05-27T09:04:42+02:00
updated: 2026-05-27T09:22:58+02:00
---

## Current Test
number: none
name: none
expected: none
awaiting: none

## Tests

### 1. Browser deck shell renders the new shared React document chrome
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and look at the deck itself (not only the outer emulator page). The deck should now look like one polished shared shell: visible spacing between keys, explicit empty wells for unused positions, and moderate bezel/glass-style chrome around the button area rather than the older flatter grid-only look. The rendered deck should still load normally and show the configured buttons inside that shell.
result: issue
reported: "ReferenceError: React is not defined at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:581:5)"
severity: blocker

### 2. Undersized virtual devices now stay usable with a persistent inline warning
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the emulator, then switch the virtual device to one that exposes fewer keys than the configured main deck needs (for example a 6-key layout if the current config needs more). Instead of replacing the page with an `Emulator Layout Error`, the deck should keep rendering the visible subset that fits, and inside the deck shell itself you should see a persistent warning banner such as `Layout mismatch` explaining that the selected virtual device exposes fewer keys than the configured deck needs.
result: issue
reported: "same issue"
severity: blocker

### 3. Hardware startup placeholder now behaves like one logo-backed temporary loading card
expected: Start the normal hardware/browser path in a fresh terminal with `pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml`. During startup, before the first real browser-backed deck render takes over, the temporary placeholder should feel like one deck-wide branded loading treatment derived from the shipped full logo rather than the old repeated `SIRENO / STARTING` tile copied identically onto every key. Once the real deck render appears, that temporary placeholder should disappear cleanly instead of lingering.
result: issue
reported: "i doesnt start same error relateed to react is missing"
severity: blocker

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and look at the deck itself (not only the outer emulator page). The deck should now look like one polished shared shell: visible spacing between keys, explicit empty wells for unused positions, and moderate bezel/glass-style chrome around the button area rather than the older flatter grid-only look. The rendered deck should still load normally and show the configured buttons inside that shell."
  status: failed
  reason: "User reported: ReferenceError: React is not defined at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:581:5)"
  severity: blocker
  test: 1
- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the emulator, then switch the virtual device to one that exposes fewer keys than the configured main deck needs (for example a 6-key layout if the current config needs more). Instead of replacing the page with an `Emulator Layout Error`, the deck should keep rendering the visible subset that fits, and inside the deck shell itself you should see a persistent warning banner such as `Layout mismatch` explaining that the selected virtual device exposes fewer keys than the configured deck needs."
  status: failed
  reason: "User reported: same issue"
  severity: blocker
  test: 2
- truth: "Start the normal hardware/browser path in a fresh terminal with `pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml`. During startup, before the first real browser-backed deck render takes over, the temporary placeholder should feel like one deck-wide branded loading treatment derived from the shipped full logo rather than the old repeated `SIRENO / STARTING` tile copied identically onto every key. Once the real deck render appears, that temporary placeholder should disappear cleanly instead of lingering."
  status: failed
  reason: "User reported: i doesnt start same error relateed to react is missing"
  severity: blocker
  test: 3
