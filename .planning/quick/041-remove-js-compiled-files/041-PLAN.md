# Quick Task 041: Remove .js compiled files and prevent recurrence

## Task 1: Prevent future tsc emissions

- **Files:**
  - `tsconfig.json`
  - `.gitignore`
- **Action:**
  1. In root `tsconfig.json`, add `"noEmit": true` to `compilerOptions` — this prevents `tsc` from emitting `.js` files alongside `.ts` sources
  2. In `.gitignore`, add `*.js` pattern as a safety net, with exceptions for all hand-written `.js` files that have no `.ts` counterpart:
     - `!packages/cli/fixtures/phase-5/*/src/index.js`
     - `!packages/cli/fixtures/phase-7/phase-7-review-addon/src/index.js`
     - `!packages/cli/fixtures/phase-12/phase-12-fit-review-addon/src/index.js`
     - `!packages/cli/fixtures/phase-22/shrink-fit-review-addon/src/index.js`
     - `!packages/cli/fixtures/phase-23/local-raw-addon/src/index.js`
     - `!packages/cli/fixtures/phase-23/local-raw-addon/src/content.js`
     - `!packages/cli/fixtures/phase-24/local-mounted-addon/src/index.js`
     - `!packages/cli/src/themes/light/index.js`
- **Verify:** `node -e "const c=require('fs').readFileSync('tsconfig.json','utf8'); process.exit(c.includes('noEmit')?0:1)" && echo "noEmit set"` and `git check-ignore packages/cli/src/addon/api.js packages/cli/src/render/reconciler.js packages/cli/src/config/schema.js 2>/dev/null | head -3`
- **Done:** root `tsconfig.json` has `"noEmit": true`, `.gitignore` has `*.js` with exceptions, compiled `.js` files under `src/` are ignored by git

## Task 2: Remove existing untracked compiled .js artifacts

- **Files:** 170 untracked `.js` files
- **Action:** Remove all untracked `.js` files under `packages/cli/src/` and compiled fixture `.js` files that have `.ts` counterparts. Preserve hand-written fixture `.js` files.
  1. Remove compiled src `.js` files: `git ls-files --others --exclude-standard 'packages/cli/src/**/*.js' | xargs rm`
  2. Remove compiled fixture `.js` files (those with `.ts` counterparts): Check each untracked fixture `.js` — if a `.ts` or `.tsx` file exists for it, remove the `.js`
  3. Also clean up `tsdown.config.js` if it exists as a stale compiled artifact
- **Verify:** `git ls-files --others --exclude-standard '*.js' | wc -l` shows significantly fewer files (only hand-written fixture files remain)
- **Done:** All compiled `.js` artifacts are removed from the working tree
