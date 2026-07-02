# Plan 17-09 — Orphaned Files Cleanup

## Gap

Two orphaned file categories:

### 1. `emoji-selector/index.tsx`

`builtin-addons/emoji-selector/index.tsx` (NOT `index.ts`) references non-existent `NewAddonManifest` type:

```tsx
import type { NewAddonManifest } from "@/addon/api"
export const manifest: NewAddonManifest = {  // NewAddonManifest doesn't exist
  apiVersion: 3,
  ...
}
```

This file is **never loaded** — the addon registry loads `index.ts` (the one with `AddonManifestV1`). The `index.tsx` is orphaned dead code.

### 2. `*.d.ts` files referencing non-existent types

Find all `.d.ts` files under `builtin-addons/` that reference `NewAddonManifest` or other non-existent types. These are generated/type-only files that reference a type that doesn't exist in `addon/api.ts`.

## Changes

### Delete `builtin-addons/emoji-selector/index.tsx`

```bash
rm packages/cli/src/builtin-addons/emoji-selector/index.tsx
```

### Find and delete orphaned `.d.ts` files

```bash
rg "NewAddonManifest" packages/cli/src/builtin-addons/ --files-with-matches
```

Delete any `.d.ts` or type-only files that reference `NewAddonManifest`.

Also check for other non-existent type references in the addons:
```bash
rg "from \"@/addon/api\"" packages/cli/src/builtin-addons/ --files-with-matches
```

For each file, verify the types actually exist in `addon/api.ts`.

## Verification

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

If deleting `index.tsx` causes import errors (e.g. `emoji-selector/index.tsx` is imported somewhere), those imports must also be removed. Check:
```bash
rg "emoji-selector/index" packages/cli/ --files-with-matches
```

## Files

- `packages/cli/src/builtin-addons/emoji-selector/index.tsx` — delete
- Any orphaned `*.d.ts` files referencing `NewAddonManifest` — delete

## Risk

Low — confirmed orphaned files with zero consumers.
