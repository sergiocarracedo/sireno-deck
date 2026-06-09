# Quick 005: icon:// protocol for action buttons

**Task:** `icon` prop in the action buttons should accept `icon://[lucide-icon-name]` to use a lucide icon by name. Keep `addon://...` and file-path behavior unchanged.

## Investigation summary

- `Icon` (`packages/cli/src/ui/Icon.tsx`) already supports three modes via discriminated `IconProps`:
  - `{ brand: 'github' }` — branded lucide
  - `{ name: 'ChevronRight' }` — generic lucide
  - `{ src: '/path/to/asset.svg' }` — DOM asset
- `Icon.tsx:60-91` already exposes `LUCIDE_ICON_EXPORTS` and `toLucideExportName()` — generic lucide lookup is already implemented; it just needs to be reached from a config string.
- The 3 built-in buttons that use `Icon` with a string `icon` prop:
  - `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx:22` — `icon={{ src: config.icon }}`
  - `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx:10` — `<Icon size={24} src={icon} />`
  - `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx:61` — `<Icon size={24} src={props.icon} />`
- All three blindly pass `config.icon` to `src`. There is no current path for the user to select a lucide icon by name through the `icon` config string.

## Plan

### Task 1: Add `resolveIconSpec` helper in `Icon.tsx`

**File:** `packages/cli/src/ui/Icon.tsx`

Add an exported helper:

```ts
export function resolveIconSpec(
  icon: string | undefined,
): { name: string } | { src: string } | undefined {
  if (!icon) return undefined
  if (icon.startsWith('icon://')) {
    return { name: icon.slice('icon://'.length) }
  }
  return { src: icon }
}
```

Reasoning: keep the public surface minimal, return an `IconProps`-shaped union so callers can spread the result directly. Sticking to `{ name }` (not `{ brand }`) gives us the generic lucide path, which already works for every lucide export.

### Task 2: Use the helper in the 3 built-in buttons

**Files:**
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx`
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx`

Replace `<Icon ... src={icon} />` and `icon={{ src: config.icon }}` with the resolved spec from `resolveIconSpec`. For the buttons that render through a small helper, push the helper down so the call site stays tidy.

**Action button** (`action.tsx:22`):

```tsx
import { resolveIconSpec } from '@/ui/Icon'
// ...
render: ({ config }) => (
  <IconLabelSurface icon={resolveIconSpec(config.icon)} label={config.label} />
)
```

**Change-deck button** (`change-deck.tsx:7-14`): turn the small inline render helper into something that calls `resolveIconSpec` and spreads the result onto `<Icon>`.

**Toggle button** (`toggle.tsx:51-67`): same pattern — `renderToggleSurface` already takes `icon?: string`; resolve inside the function and pass to `<Icon>`.

### Task 3: Tests

**File:** `packages/cli/src/ui/Icon.test.tsx` (new) — small unit tests for the helper:

- `icon://chevron-right` → `{ name: 'chevron-right' }`
- `addon://core-buttons/clock.svg` → `{ src: 'addon://core-buttons/clock.svg' }`
- `/abs/path/icon.png` → `{ src: '/abs/path/icon.png' }`
- `undefined` → `undefined`
- empty string `''` → `undefined` (matches the existing `if (!icon)` guard)
- the icon prop on the existing `Icon` component test (if any) does not need to change — only the helper is new

Skip: end-to-end rendering of the action button. The unit tests for the helper cover the routing decision; the visual outcome is already covered by existing `Icon` tests.

## Verification

```bash
pnpm --filter sireno-deck-cli exec tsc --noEmit
pnpm --filter sireno-deck-cli exec vitest run --reporter=basic src/ui
```

Both must be green. The 3 built-in button files must still typecheck.

## must_haves (vanilla quick, not validated — included for completeness)

- `resolveIconSpec` exported from `@/ui/Icon`
- `icon://...` strings route to the lucide name path
- `addon://...`, absolute paths, and URLs continue to route to the DOM `src` path
- No new dependencies
- The 3 built-in button renderers are the only call sites that need editing
