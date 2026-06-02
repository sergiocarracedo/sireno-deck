# Quick Task 023 Plan

**Task:** make @ alias resolve when running pnpm cli:dev

## Tasks

<task id="023-01">
<title>Point the workspace-root cli:dev tsx seam at the package tsconfig</title>
<files>
- package.json
- packages/cli/src/cli/dev-watch.ts
</files>
<action>
Keep the existing root `cli:dev` watch seam, but make the actual `tsx` runtime resolve `@/…` imports using `packages/cli/tsconfig.json` instead of the workspace-root tsconfig. Prefer the smallest fix at the root script seam so bare `pnpm cli:dev` and forwarded runs both inherit the same alias-aware runtime behavior without widening package build/test configuration again.
</action>
<verify>
Run `pnpm exec tsx packages/cli/src/cli/dev-watch.ts --help` and `pnpm run cli:dev --help`.
</verify>
<done>
The real `cli:dev` runtime path no longer throws `ERR_MODULE_NOT_FOUND` for `@/…` imports, and the workspace-root watch seam still reaches the actual CLI help path.
</done>
</task>
