# Quick Task 029 Plan

---
description: in /works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx the icon component will get a icon name, and it should resolve that name automatically to the lucide icon, dont use a hardcoed map
created: 2026-06-02
must_haves:
  truths:
    - Generic `Icon` names resolve through the live `lucide-react` export surface instead of a handwritten registry.
    - Unknown generic icon names still fail clearly instead of rendering broken output silently.
  artifacts:
    - packages/cli/src/ui/Icon.tsx
    - packages/cli/src/ui/Icon.test.tsx
    - packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx
    - packages/cli/src/deck/runtime.ts
  key_links:
    - packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx
    - packages/cli/src/deck/runtime.ts
---

## Task 1

<files>
- packages/cli/src/ui/Icon.tsx
</files>

<action>
Replace the generic Lucide icon registry with name-based resolution from the `lucide-react` module exports while keeping the existing `brand` and `src` behavior intact. Preserve current accessibility and theme wrapping behavior, and make invalid generic names fail with an explicit error.
</action>

<verify>
Read the updated `Icon.tsx` to confirm generic icon rendering no longer depends on a handwritten map and that invalid names throw a clear error.
</verify>

<done>
`Icon` accepts real Lucide names like `clock`, `play`, `sparkles`, `pause`, `square`, `slash`, and `triangle-alert` via automatic resolution without a hardcoded registry.
</done>

## Task 2

<files>
- packages/cli/src/ui/Icon.test.tsx
</files>

<action>
Add focused tests proving generic names resolve to the matching Lucide component, aliases used in the app still work, and invalid names throw a useful error.
</action>

<verify>
Run a targeted Vitest command covering the new `Icon` tests.
</verify>

<done>
Targeted tests pass and lock the intended name-resolution behavior.
</done>
