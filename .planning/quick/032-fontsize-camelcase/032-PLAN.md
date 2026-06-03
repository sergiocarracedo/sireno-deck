---
objective: "Rename the 'font-size' schema key and its code accessor to 'fontSize' (camelCase) in TypeScript."
---

# Plan 032: Rename font-size to fontSize in TypeScript code

<task id="032-01">
<title>Rename font-size to fontSize in schema and accessor code</title>
<files>
- packages/cli/src/config/theme/schemas.ts
- packages/cli/src/render/theme-utilities.ts
</files>
<action>
Two changes:

1. `packages/cli/src/config/theme/schemas.ts` line 16: change `'font-size': z.number().positive()` to `fontSize: z.number().positive()`

2. `packages/cli/src/render/theme-utilities.ts` line 33: change `${role.font_size}px` to `${role.fontSize}px`
</action>
<verify>
Run `pnpm typecheck --filter sireno-deck-cli` to confirm no type errors.
</verify>
<done>
The schema key and code accessor both use `fontSize` (camelCase).
</done>
</task>
