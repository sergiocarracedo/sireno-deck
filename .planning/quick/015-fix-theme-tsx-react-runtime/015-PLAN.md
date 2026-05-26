---
wave: 1
depends_on: []
files_modified:
  - packages/cli/src/themes/default/ButtonFrame.tsx
  - packages/cli/src/config/theme.test.ts
autonomous: true
single_layer_justified: false
objective: "The shipped default theme loads through the real TSX runtime path without throwing `React is not defined`, and focused coverage proves the built-in theme frame can be invoked through `resolveTheme('dark')`."
must_haves:
  truths:
    - "`packages/cli/src/themes/default/ButtonFrame.tsx` no longer depends on an ambient `React` global when loaded through the theme runtime snapshot."
    - "`packages/cli/src/config/theme.test.ts` proves `resolveTheme('dark')` can invoke the built-in `buttonFrame` without a runtime `React is not defined` failure."
    - "Focused verification reproduces the fixed CLI/theme path or equivalent built-in resolver path with exit code 0."
  artifacts:
    - packages/cli/src/themes/default/ButtonFrame.tsx
    - packages/cli/src/config/theme.test.ts
  key_links:
    - "`packages/cli/src/config/theme.ts` imports the built-in default theme runtime from `packages/cli/src/themes/default/index.ts`, which re-exports `ButtonFrame` from `ButtonFrame.tsx`."
---

# Quick Task 015 Plan: Fix Theme TSX React Runtime

<objective>
Fix the shipped default theme so it survives the Phase 25 raw TSX runtime seam on the real CLI path. The task stays narrow: remove the ambient-React assumption from the built-in `ButtonFrame.tsx`, then lock the regression in focused theme resolver coverage that actually invokes the built-in frame.
</objective>

## Tasks

<task id="015-01">
<title>Remove the ambient React dependency from the default theme frame</title>
<files>
- packages/cli/src/themes/default/ButtonFrame.tsx
- packages/cli/src/config/theme.test.ts
</files>
<action>
Update `packages/cli/src/themes/default/ButtonFrame.tsx` so the shipped built-in frame does not rely on an ambient `React` global when loaded through `tsx/esm/api` with `tsconfig: false`. Keep the existing rendered structure and public component contract intact. Then extend `packages/cli/src/config/theme.test.ts` so the built-in `resolveTheme('dark')` path not only checks `filePaths`, but also invokes `theme.buttonFrame({ children: null, state: 'idle' })` and asserts the built-in frame marker is present without throwing.
</action>
<verify>
- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts -t "loads a built-in theme by name"`
- `pnpm exec tsx --eval "(async () => { const { resolveTheme } = await import('./packages/cli/src/config/theme.ts'); const theme = await resolveTheme('dark'); const element = theme.buttonFrame({ children: null, state: 'idle' }); console.log(element.props['data-sireno-button-frame']); })().catch((error) => { console.error(error); process.exit(1); });"`
</verify>
<done>
The built-in default theme frame can be invoked through the real theme resolver path without `React is not defined`, and the focused test proves the built-in frame marker is emitted.
</done>
</task>
