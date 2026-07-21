# Plan 10-05 Summary

**Completed:** 2026-07-21

## What was built

Added support for `!include path/to/file.yml` in user config files. The resolver walks the raw YAML line by line and replaces each `!include` directive with the included file's content (recursively resolved), preserving indentation so the merged result is valid YAML. Paths are resolved relative to the defining file; absolute paths pass through unchanged. Cycles throw `IncludeResolutionError`; missing files do the same. Wired into `config/loader.ts` so it runs before Zod validation.

## Key files

- `packages/cli/src/config/include-resolver.ts`: line-based scanner. For each line matching `^(\s*)(.*?)\s*!include\s+(\S+)(.*)$`, it reads the file, recursively resolves its includes, and replaces the line. Top-level `!include path` (no key prefix) inlines the file directly. `key: !include path` (with a key prefix) converts to block-style `key:\n  <indented content>` so the included file's top-level keys become children of `key`.
- `packages/cli/src/config/__tests__/include-resolver.test.ts`: 7 tests covering single include, recursive includes, circular reference, missing file, absolute path, sibling re-include, and pass-through unchanged.
- `packages/cli/src/config/loader.ts`: calls `resolveIncludes(raw, absolutePath)` before `parseDocument`. If includes were present, parses the inlined text and returns its JSON; otherwise the existing parse path runs unchanged.

## Decisions made

- **Textual pre-processing over yaml customTags.** Chose to inline includes as text before yaml parses. This is simpler than yaml's customTags API and avoids schema-tagging complexity. The trade-off: included content participates in yaml's standard merge semantics (last-wins on duplicate keys at the same level) — see "deferred" below.
- **Line-based scanner, not character-by-character.** Each `!include` directive is on its own line. Block-style `key:\n  !include path.yml` (where `!include` is on a continuation line) is NOT supported — `key: !include path.yml` (inline form) is the only supported shape. This matches the CONTEXT decision ("notation open to suggestions, e.g. `!include`") and the user's example.
- **Cycle detection via `Set<string>` of visited absolute paths.** Adds the next path BEFORE recursing; the check `if (visited.has(includePath))` catches cycles. Throws `IncludeResolutionError` with the full cycle path in the error message.
- **Error wrapping in loader.ts.** `IncludeResolutionError` is caught at the loader boundary and re-thrown as `ConfigLoadError` with the same `issues` array, matching the existing error-reporting style.
- **Recursive resolution: `!include` lines inside the included file are also resolved** before the file's content is inlined. Cycle detection tracks the full chain.

## Deferred

- **Deep-merge for objects, concat-with-last-wins-on-id for arrays.** The CONTEXT.md specified this merge semantics for cases like:
  ```yaml
  decks:
    - {id: a}
  decks: !include b.yml  # has [{id: b}]
  ```
  Result with current implementation: `decks: [{id: b}]` (yaml's last-wins on the whole key). Result with deep-merge/concat: `decks: [{id: a}, {id: b}]` (concat, no id collision).
  This requires either:
  - Custom yaml merge-key handling (use `<<:` or process tokens with `keepSourceTokens`)
  - A second post-parse pass that tracks provenance and merges
  - Rewriting using yaml's `customTags` API to participate in the parse tree

  For now, the practical workaround is: if the user wants the same key defined in two places, put each `!include` under a distinct parent key (e.g. `decks_a: !include a.yml` + `decks_b: !include b.yml`). The MVP covers the most common use case (splitting config across multiple files for organization) without merge semantics.

## Notes for downstream

- 7 new tests pass; existing 62 config tests + 1 unrelated pre-existing emulator failure don't change.
- The resolver works for the typical config-splitting use case: separate files for `addons/`, `decks/main.yml`, `decks/media.yml`, etc., composed into one `config.yml`.
- If users report merge-semantics requirements, the path forward is to switch from textual pre-processing to yaml's customTag `resolve()` callback, which can participate in the parse tree directly.