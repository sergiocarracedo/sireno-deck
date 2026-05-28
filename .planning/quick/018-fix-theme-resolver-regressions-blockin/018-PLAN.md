# Quick Task 018 Plan

**Task:** Fix theme resolver regressions blocking ship

## Tasks

<task id="018-01">
<title>Restore theme manifest compatibility while preserving the new border token</title>
<files>
- packages/cli/src/config/theme.ts
</files>
<action>
Update theme manifest parsing so `border` is optional for on-disk manifests, but the resolved runtime `Theme` object still always exposes a concrete `border` value. Preserve the new token by preferring `manifest.border` when present and falling back to the legacy accent color when it is omitted. Keep the resolver behavior otherwise unchanged.
</action>
<verify>
grep -n "border: z.string().min(1).optional()\|border: manifest.border ?? manifest.accent" packages/cli/src/config/theme.ts
</verify>
<done>
Legacy theme manifests without `border` resolve successfully again, while resolved themes still surface a usable `border` token for the utility layer.
</done>
</task>

<task id="018-02">
<title>Add focused resolver regression coverage for border fallback and explicit override</title>
<files>
- packages/cli/src/config/theme.test.ts
</files>
<action>
Extend the theme resolver tests with focused assertions that a custom theme manifest without `border` still resolves and falls back to `accent`, and that a manifest with an explicit `border` preserves that override. Keep the existing fixture/test structure intact and verify using the real resolver path.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts
</verify>
<done>
The previously failing theme resolver tests pass, and the new border compatibility behavior is locked by focused test assertions.
</done>
</task>
