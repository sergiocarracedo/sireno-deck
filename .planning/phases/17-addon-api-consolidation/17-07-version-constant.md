# Plan 17-07 — Version Constant Unification

## Gap

Three definitions of `SIRENO_ADDON_API_VERSION`:
- `packages/cli/src/version.ts:2` = **3** (public constant, re-exported via `@/index`)
- `packages/cli/src/addon/api.ts:8` = **1**
- `packages/cli/src/addon/api-types.ts:3` = **1** (re-exported via `@/addon`)

The canonical public value is **3** (used by `cli.test.ts`, referenced in `AGENTS.md` as the addon contract). All builtin addon manifests declare `apiVersion: 1`.

Also: `session/__tests__/index.test.ts:7` has `expect(sessionAddon.apiVersion).toBe(3)` but `session/index.ts:10` declares `apiVersion: 1`. This test would fail.

## Changes

### 1. `addon/api-types.ts` + `addon/api.ts` — change to 3

Both files define the constant. Update both:
```ts
// Before:
export const SIRENO_ADDON_API_VERSION = 1 as const

// After:
export const SIRENO_ADDON_API_VERSION = 3 as const
```

### 2. All 10 builtin addon `index.ts` manifests — change `apiVersion: 1` → `apiVersion: 3`

List of files:
- `builtin-addons/core-buttons/index.ts:13`
- `builtin-addons/date-time/index.ts:15`
- `builtin-addons/weather/index.ts:7`
- `builtin-addons/media/index.ts:188`
- `builtin-addons/system-status/index.ts:7`
- `builtin-addons/emoji-selector/index.ts:16` (the non-orphaned `index.ts`)
- `builtin-addons/session/index.ts:10`
- `builtin-addons/brightness/index.ts:7`
- `builtin-addons/value-display/index.ts:7`
- `builtin-addons/internal-settings/index.ts:17`

### 3. All `sirenodeck.json` files — change `"apiVersion": 1` → `"apiVersion": 3`

List of files:
- `builtin-addons/core-buttons/sirenodeck.json:3`
- `builtin-addons/date-time/sirenodeck.json:3`
- `builtin-addons/weather/sirenodeck.json:3`
- `builtin-addons/media/sirenodeck.json:3`
- `builtin-addons/system-status/sirenodeck.json:3`
- `builtin-addons/emoji-selector/sirenodeck.json:3`
- `builtin-addons/session/sirenodeck.json:3`
- `builtin-addons/brightness/sirenodeck.json:3`
- `builtin-addons/value-display/sirenodeck.json:3`
- `builtin-addons/internal-settings/sirenodeck.json:3`

### 4. `session/__tests__/index.test.ts` — fix wrong assertion

```ts
// Before:
expect(sessionAddon.apiVersion).toBe(3)

// After:
expect(sessionAddon.apiVersion).toBe(3)  // already correct, test is right
```

Wait — the test says `toBe(3)` but the manifest is `1`. So the test is the **desired** state (wants 3) and the manifest is wrong. Update manifest → 3. Test assertion is already correct.

### 5. `addon/loader.ts` — verify loader accepts apiVersion 3

```ts
// Line 64 in loader.ts:
if (obj["apiVersion"] !== 1) return null;
```

This check is on the **runtime-loaded manifest** (the JS object exported from the addon's `index.ts`). It currently rejects any addon with `apiVersion !== 1`. After the change to `apiVersion: 3`, this would reject all addons.

**Fix:** Change to:
```ts
if (obj["apiVersion"] !== 3) return null;
```

Also update lines 184 and 320 if they have similar checks.

### 6. `core-buttons/__tests__/index.test.ts` — check for version assertion

```ts
// Before (line 10):
expect(coreButtonsAddon.apiVersion).toBe(1)

// After:
expect(coreButtonsAddon.apiVersion).toBe(3)
```

## Files

- `packages/cli/src/addon/api-types.ts`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/addon/loader.ts`
- 10 × `index.ts` manifests (list above)
- 10 × `sirenodeck.json` files (list above)
- `packages/cli/src/builtin-addons/core-buttons/__tests__/index.test.ts`

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

## Risk

Medium — changes the loader validation which is central to addon loading. Test must pass.
