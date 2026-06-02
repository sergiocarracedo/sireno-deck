# Quick Task 025 Plan

**Task:** Fix this error you added: `ConfigValidationError: Failed to import theme runtime: Cannot resolve tsconfig at path: /works/opensource/sireno-deck/packages/cli/src/tsconfig.json` from `pnpm run cli:dev emulate --port 8912`

## Tasks

<task id="025-01">
<title>Fix theme runtime tsconfig resolution on the Tailwind prebuild path</title>
<files>
- packages/cli/src/config/theme/theme.ts
- packages/cli/src/config/theme/theme.test.ts
</files>
<action>
Correct the package-tsconfig path used by `importThemeRuntime(...)` so TSX theme runtime imports resolve against the real package `tsconfig.json`, not a nonexistent path under `packages/cli/src`. Keep the rest of the theme runtime import contract unchanged. Add or adjust focused regression coverage in `theme.test.ts` so the built-in/custom TSX theme runtime seam still proves the intended package-tsconfig policy.
</action>
<verify>
Run `pnpm --filter sireno-deck-cli exec vitest run src/config/theme/theme.test.ts -t "loads a built-in theme by name|loads a committed custom .tsx theme fixture through the real resolver path"`.
</verify>
<done>
The theme runtime loader points at the real package tsconfig path, and the focused TSX theme runtime tests pass.
</done>
</task>

<task id="025-02">
<title>Prove the real cli:dev watch seam starts again after the theme fix</title>
<files>
- packages/cli/src/cli/build-tailwind-browser.ts
- packages/cli/src/cli/dev-watch.ts
</files>
<action>
Do not broaden the Tailwind or dev-watch design unless the fix requires it. Re-verify the existing watch/prebuild seam against the real workspace-root command so `pnpm run cli:dev emulate --port 0` reaches emulator startup instead of failing during the Tailwind prebuild theme-resolution step. Only change source files here if verification exposes another code issue directly on this seam.
</action>
<verify>
Run `pnpm run cli:dev emulate --port 0` and confirm the output reaches `browser deck emulator started`.
</verify>
<done>
The workspace-root `cli:dev` command gets through Tailwind prebuild and starts the emulator without the tsconfig-resolution `ConfigValidationError`.
</done>
</task>
