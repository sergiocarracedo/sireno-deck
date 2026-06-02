# Plan 34-01 Summary

## What Built

- Published a shared public command-action contract in `packages/cli/src/addon/api.ts` with `AddonButtonActionCommandsSchema`, `AddonButtonActionConfigSchema`, and `useButtonActionCommand(...)`.
- Re-exported the new command-action API from `packages/cli/src/index.ts` so addon authors can consume it from the package root.
- Migrated the bundled `action` button from flat `command` wiring to nested `commands` and the shared hook.
- Expanded `packages/cli/src/builtin-addons/core-buttons/index.test.ts` to prove tap, hold, double-tap suppression, and silent unmatched partial-command behavior on the shipped `action` button.

## Verification

- `grep -n "useButtonActionCommand|double-tap|commands" packages/cli/src/addon packages/cli/src/index.ts`
- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts -t "action|double|hold|command"`

## Commits

- `d90fa3d` `feat(34-01): publish shared command-action hook`
- `bb7d4d4` `feat(34-01): migrate action button to shared commands`

## Notes

- The shared hook keeps command execution on `methods.runCommand(...)`, does not auto-invalidate, and keeps gesture policy addon-side instead of widening `deck/runtime.ts`.
- The first adopter intentionally stays small: the `action` button now proves the public contract end-to-end before broader built-in migrations.
