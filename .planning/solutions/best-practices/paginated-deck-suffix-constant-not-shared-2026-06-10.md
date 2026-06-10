---
title: Paginated deck `-p{N}` suffix pattern is duplicated between modules
date: 2026-06-10
category: best-practices
module: core/pagination
problem_type: best_practice
severity: medium
tags:
  - pagination
  - constant-drift
  - regex-pattern
  - deck-id-convention
  - starts-with
  - shared-constant
applies_when:
  - Two modules independently define the same naming convention for generated IDs
  - One module uses a regex and another uses `startsWith()` with a hardcoded prefix
  - The convention suffix (`-p{N}`) is referenced but never exported as a shared constant
---

# Paginated deck `-p{N}` suffix pattern is duplicated between modules

## Context

Two modules independently encode the paginated deck ID naming convention, with different approaches that can drift:

| Module | Location | Pattern | Matches |
|--------|----------|---------|---------|
| `pagination.ts` | Line 12 | `/-\p\d+$/` (regex) | `foo-p1`, `foo-p42` |
| `system-buttons.ts` | Line 24 | `` deckId.startsWith(`${overlayDeckId}-p`) `` (string prefix) | `foo-p`, `foo-panything` |

The `startsWith` approach is broader than the regex — it matches `foo-p`, `foo-pbar`, `foo-p-1`, etc., while the regex requires one or more digits after `-p` and must be at the end of the string.

## Guidance

**Export and share the suffix pattern as a constant from a single source of truth.** Both the regex and the `startsWith` check should reference the same constant.

```typescript
// ✅ IN: core/pagination.ts — single source of truth
export const PAGE_DECK_SUFFIX_PATTERN = /-p\d+$/
export const PAGE_DECK_PREFIX = '-p'

// ✅ IN: system-buttons.ts — import and use
import { PAGE_DECK_PREFIX } from '@/core/pagination'

function isOverlayOrPageOf(deckId: string, overlayDeckId: string): boolean {
  return deckId === overlayDeckId || deckId.startsWith(`${overlayDeckId}${PAGE_DECK_PREFIX}`)
}
```

If `startsWith` is kept intentionally broader (to match both `-p1` and `-p`), document the design intent explicitly and make it a separable check.

## Why This Matters

- **Drift between the two patterns is inevitable** without a shared constant. If the naming convention changes (e.g., to `-page{N}`), two edits are required.
- **The `startsWith` approach is more permissive** than the regex. It could match edge-case deck IDs like `foo-process_bar` if an overlay deck ID ends with `-`. This currently doesn't cause issues because overlay deck IDs follow a well-known set, but it's a latent bug.
- **Exported constants document the shared contract** of the naming convention. A future developer adding paginated deck logic in a third module knows where to look.

## When to Apply

- Any time the same naming convention, token, or pattern is independently re-derived in two modules.
- When `startsWith` is used to match a suffix pattern that is also validated by regex elsewhere — prefer a shared constant or document why the approaches differ intentionally.
- During code review: flag hardcoded magic strings that represent the same domain concept in different files.

## Examples

```typescript
// ❌ BEFORE: Two independent implementations
// pagination.ts
const PAGE_DECK_SUFFIX_PATTERN = /-p\d+$/

// system-buttons.ts
function isOverlayOrPageOf(deckId: string, overlayDeckId: string): boolean {
  return deckId === overlayDeckId || deckId.startsWith(`${overlayDeckId}-p`)
}

// ✅ AFTER: Shared constant
// pagination.ts
export const PAGE_DECK_PREFIX = '-p'
const PAGE_DECK_SUFFIX_PATTERN = new RegExp(`${PAGE_DECK_PREFIX}\\d+$`)

// system-buttons.ts
import { PAGE_DECK_PREFIX } from '@/core/pagination'

function isOverlayOrPageOf(deckId: string, overlayDeckId: string): boolean {
  return deckId === overlayDeckId || deckId.startsWith(`${overlayDeckId}${PAGE_DECK_PREFIX}`)
}
```

## Related

- [AGENTS.md Principle #9: Keep Copies in Sync](../../../../../AGENTS.md) — when the same logic exists in two places, fix both when you fix one
- `packages/cli/src/core/pagination.ts` — `PAGE_DECK_SUFFIX_PATTERN` at line 12
- `packages/cli/src/deck/system-buttons/system-buttons.ts` — `isOverlayOrPageOf` at line 20
