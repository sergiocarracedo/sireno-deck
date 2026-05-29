---
wave: 1
depends_on: []
files_modified:
  - packages/cli/src/render/shrink-fit-browser-script.ts
  - packages/cli/src/cli/commands/start.ts
  - packages/cli/src/render/dom-host.test.tsx
autonomous: true
single_layer_justified: false
objective: "Phase 2 shrink-fit reruns when browser font metrics settle and uses one canonical observer root across emulator patch cycles, closing the two review findings without widening the public contract."
---

# Plan 020: Fix Phase 2 Shrink-Fit Review Findings

<objective>
Close the two Phase 2 review findings surgically. The browser shrink-fit helper must rerun when real font metrics finish loading, and the emulator/browser helper must normalize onto one canonical root so repeated patch cycles do not accumulate duplicate observer state.
</objective>

## Tasks

<task id="020-01">
<title>Harden the shrink-fit browser helper against font-load drift and duplicate observer roots</title>
<files>
- packages/cli/src/render/shrink-fit-browser-script.ts
- packages/cli/src/cli/commands/start.ts
- packages/cli/src/render/dom-host.test.tsx
</files>
<action>
Update the browser helper so it normalizes all scheduling and observer state onto one canonical browser-shell root instead of mixing `document.body`, `mount`, and `#deck-root`. Add a font-loading rerun hook using the browser font-loading API when available so shrink-fit remeasures after theme fonts settle. Keep the public `Text` contract unchanged, keep measurement browser-only, and add focused script-string regressions in `dom-host.test.tsx` that prove the new root normalization and font-rerun behavior without pretending Vitest can do live layout.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx
</verify>
<done>
The shrink-fit helper reruns on async font settlement, emulator/browser calls use one canonical root path, and `dom-host.test.tsx` locks both behaviors with passing focused assertions.
</done>
</task>
