---
title: processNamesMatch silently matches every process with empty/whitespace names
date: 2026-06-10
category: logic-errors
module: deck/runtime
problem_type: logic_error
severity: high
tags:
  - javascript-gotcha
  - string-includes
  - empty-string
  - substring-matching
  - process-names
  - array-some
symptoms:
  - Empty or whitespace-only `process_names` entries cause overlay decks to activate for every running process
  - A config validation that passes `process_names: ['']` silently matches anything
  - No warning or error when an empty name is declared
root_cause: In JavaScript, `"anyString".includes("")` always returns `true` because every string contains the empty string as a substring at position 0. The `processNamesMatch` function used `Array.some(fn)` with `normalizedActive.includes(trimmed)` — when `trimmed` is `""`, it always matches.
resolution_type: code_fix
---

# processNamesMatch silently matches every process with empty/whitespace names

## Problem

Empty or whitespace-only strings in a deck's `process_names` config array match every running process, causing overlay decks to activate spuriously on any focused application. This is a universal JavaScript gotcha with `String.prototype.includes()`.

## Symptoms

- An overlay deck configured with `process_names: [""]` or `process_names: ["   "]` activates on *every* application switch, not just the intended one.
- The bug only manifests at runtime — schema validation accepts the input because `process_names: [""]` can pass or be accidentally generated.
- Hard to diagnose because the connection between `process_names` config and overlay behavior is indirect.

## What Didn't Work

- Schema-level validation could reject `""` strings in `process_names`, but whitespace-only strings would still pass through (e.g., after `.trim()` removal in some processing path, but not others).
- Checking `name.length === 0` catches `""` but not `"   "`.

## Solution

Add a falsy/empty guard inside the `.some()` callback after trimming:

```typescript
return declared.some((name) => {
  const trimmed = name.toLowerCase().trim()
  if (!trimmed) return false  // empty/whitespace-only → no match
  return normalizedActive.includes(trimmed)
})
```

## Why This Works

The guard catches both the empty string and whitespace-only strings in one check. Since `!trimmed` is `true` when `trimmed` is `""` (falsy), the callback returns `false` immediately, never reaching the `.includes()` call that would incorrectly match everything.

This is the minimal, surgical fix — it doesn't change the function signature, doesn't affect valid names, and adds zero overhead for the common case.

## Prevention

- Always guard `.includes()` and `.indexOf()` calls when the search string could be empty or come from user input.
- In any `Array.some(fn)` + `str.includes(sub)` pattern, verify that `sub` is non-empty before the match. The pattern `!sub || parent.includes(sub)` is a universal guard.
- Consider a lint rule or code review checklist item for `.includes("")` — it is a perennially surprising JS behavior.

## Related

- [MDN: String.prototype.includes()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes) — "returns true if searchString appears as a substring of the result, at some position, or the empty string"
- [ECMAScript spec: String.prototype.includes](https://tc39.es/ecma262/#sec-string.prototype.includes) — searchString coercion with `IsRegExp` check, `length=0` returns `true`
