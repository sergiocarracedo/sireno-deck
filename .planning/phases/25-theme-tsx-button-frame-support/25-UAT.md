---
status: complete
phase: 25-theme-tsx-button-frame-support
source:
  - 25-01-SUMMARY.md
  - 25-02-SUMMARY.md
started: 2026-05-26T22:09:56+02:00
updated: 2026-05-26T22:22:10+02:00
---

## Current Test
number: none
name: none
expected: none
awaiting: none

## Tests

### 1. Built-in dark theme resolves through the real TypeScript entry graph
expected: From the repo root, run `pnpm exec tsx --eval "(async () => { const { resolveTheme } = await import('./packages/cli/src/config/theme.ts'); const theme = await resolveTheme('dark'); console.log(JSON.stringify(theme.filePaths.map((filePath) => filePath.replace(process.cwd() + '/', '')), null, 2)); })().catch((error) => { console.error(error); process.exit(1); });"`. The printed file list should include `packages/cli/src/themes/default/manifest.yml`, `packages/cli/src/themes/default/index.ts`, and `packages/cli/src/themes/default/ButtonFrame.tsx`.
result: pass

### 2. Custom TSX theme fixture resolves through the same public contract
expected: From the repo root, run `pnpm exec tsx --eval "(async () => { const { resolveTheme } = await import('./packages/cli/src/config/theme.ts'); const theme = await resolveTheme('./packages/cli/fixtures/phase-25/custom-tsx-theme'); const element = theme.buttonFrame({ children: null, state: 'hold' }); console.log(JSON.stringify({ name: theme.name, filePaths: theme.filePaths.map((filePath) => filePath.replace(process.cwd() + '/', '')), props: element.props }, null, 2)); })().catch((error) => { console.error(error); process.exit(1); });"`. The output should show `name: "phase-25-custom"`, include the fixture `manifest.yml`, `index.tsx`, and `frame.tsx` in `filePaths`, and print `data-frame-source: "phase-25-custom"` with `data-frame-state: "hold"`.
result: pass

### 3. Out-of-root theme imports fail with the explicit boundary error
expected: From the repo root, run `pnpm exec tsx --eval "(async () => { const { resolveTheme } = await import('./packages/cli/src/config/theme.ts'); try { await resolveTheme('./packages/cli/fixtures/phase-25/out-of-root-theme'); console.log('UNEXPECTED_SUCCESS'); } catch (error) { console.log(error instanceof Error ? error.message : String(error)); } })().catch((error) => { console.error(error); process.exit(1); });"`. The command should not print `UNEXPECTED_SUCCESS`; it should print `Theme 'phase-25-broken' runtime imports must stay inside the theme package root`.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
