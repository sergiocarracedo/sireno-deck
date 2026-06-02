# Quick Task 024 Plan

**Task:** Done in 78ms Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/works/opensource/sireno-deck/packages/cli/src/cli/index.js' imported from /works/opensource/sireno-deck/packages/cli/src/cli/dev-watch.ts

## Tasks

<task id="024-01">
<title>Fix the dev-watch source import seam and lock it with focused proof</title>
<files>
- packages/cli/src/cli/dev-watch.ts
- packages/cli/src/cli/dev-watch.test.ts
</files>
<action>
Update the watched source launcher so it imports the real source entrypoint instead of assuming a built `index.js` exists beside `dev-watch.ts`. Keep the current forwarded-args and Tailwind-prebuild behavior intact. Add or update focused regression coverage so the test seam proves `dev-watch` still resolves args/config correctly and that its source import path stays truthful for the raw `tsx watch` workflow.
</action>
<verify>
Run `pnpm --filter sireno-deck-cli exec vitest run src/cli/dev-watch.test.ts`.
</verify>
<done>
`packages/cli/src/cli/dev-watch.ts` no longer imports a missing sibling `index.js` file on the raw source path, and the focused `dev-watch` test suite passes.
</done>
</task>
