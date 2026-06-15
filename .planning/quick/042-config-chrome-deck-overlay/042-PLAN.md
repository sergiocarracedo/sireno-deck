# 042-PLAN: Add `process_names: ['chrome']` to the chrome deck

**Task:** Make the chrome deck render when chrome is the active foreground app.

**Status:** Ready to execute.

## Scope

Touch only `config.yml`. Do not modify runtime, schemas, or any other file.
Do not commit the surrounding dirty working tree; this quick commit touches
`config.yml` alone.

## Task 1 — Add `process_names` to the `chrome` deck

**Files:** `config.yml`

**Action:** In the `chrome` deck (currently at lines 75-81), add a
`process_names: ['chrome']` field. The field is a YAML array of substrings
that the Phase 55 active-app monitor matches against the foreground process
name (case-insensitive, with auto OS-specific suffix `.app` / `.exe`).

`chrome` matches:

- `google-chrome` (Linux binary)
- `Google Chrome` (macOS, with auto `.app` suffix)
- `chrome.exe` (Windows, with auto `.exe` suffix)

Place `process_names` immediately after `id: chrome` and before `buttons:` to
match the field order used elsewhere in the file (e.g. `process_names` in the
schema sits between `name?` and `process_names?` — see `schemas.ts:130`).

Target shape:

```yaml
  chrome:
    id: chrome
    process_names:
      - chrome
    buttons:
      - position: 0
        type: action
        label: 'New tab'
        icon: 'icon://square-plus'
```

**Verify:**

1. `node -e "const y=require('js-yaml');const fs=require('fs');const c=y.load(fs.readFileSync('config.yml','utf8'));console.log(c.decks.chrome.process_names)"`
   prints `[ 'chrome' ]`.
2. `pnpm --filter sireno-deck-cli exec tsc --noEmit` — no errors.
3. `pnpm --filter sireno-deck-cli exec vitest run --reporter=basic packages/cli/src/core` — green (the
   `process_names` schema tests must still pass; the new field is just a value
   on a deck, not a new schema).

**Done:** `config.yml` has `process_names: [chrome]` on the `chrome` deck;
schema validates; existing tests pass; nothing else in the working tree is
modified.

## Notes for the executor

- `git add config.yml` ONLY. Do not `git add .` or `git add -u`.
- Commit message: `feat(quick-042): make chrome deck render as active-app overlay for chrome`.
- If `tsc --noEmit` or the core test run fails for a reason unrelated to
  this edit (e.g. pre-existing dirty file), stop and report — do not try to
  fix unrelated breakage.
