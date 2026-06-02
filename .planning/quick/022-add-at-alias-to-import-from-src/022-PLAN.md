# Quick Task 022 Plan

**Task:** add the @ alias to import from src/

## Tasks

<task id="022-01">
<title>Add package-level `@/*` alias resolution for `src/*`</title>
<files>
- packages/cli/tsconfig.json
- packages/cli/vitest.config.ts
</files>
<action>
Add a package-level TypeScript path alias so `@/*` resolves to `./src/*` inside `packages/cli`. Keep the existing `sireno-deck-cli` alias intact. Update the Vitest config to mirror that alias at test runtime so source files imported through `@/…` resolve on the actual test path too.
</action>
<verify>
Run `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/date-time/index.test.ts` and `pnpm --filter sireno-deck-cli run build`.
</verify>
<done>
`packages/cli` can resolve `@/…` imports through both TypeScript and Vitest, and the existing date-time import path plus package build pass without alias-resolution failures.
</done>
</task>
