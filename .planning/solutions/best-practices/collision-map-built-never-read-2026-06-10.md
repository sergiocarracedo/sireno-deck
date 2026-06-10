---
title: Collision-tracking Map was allocated in closure but never queried
date: 2026-06-10
category: best-practices
module: deck/runtime
problem_type: best_practice
severity: low
tags:
  - dead-code
  - unused-collection
  - map-vs-set
  - process-names
  - collision-detection
  - code-clarity
applies_when:
  - A collection is built during construction with the intent to look up later
  - The lookup path independently rescans the same source data instead
  - A Map's value type is never used (only keys matter for dedup)
---

# Collision-tracking Map was built in closure but never queried

## Context

During deck runtime construction, a `Map<string, string[]>` was allocated to log warnings when multiple decks shared the same `process_names` entry. The Map had an elaborate value type (`string[]`, meaning to track which deck IDs collided per name), but **the Map was never read after construction**. The actual collision check happened independently in `findActiveAppDeckFor`, which rescanned `runtimeDecks` and used first-match semantics.

## Guidance

When building a data structure during construction with the apparent intent to use it later, verify that the later code path actually reads from it. If not:

1. Either remove the dead collection entirely, or
2. Replace it with the simplest structure that serves its actual purpose.

In this case, the `Map<string, string[]>` was replaced with a `Set<string>`, since the only purpose of the collection was to deduplicate collision warnings:

```typescript
// ❌ BEFORE: Map with string[] value — never queried
const seenProcessNames = new Map<string, string[]>()
for (const [deckId, deck] of Object.entries(runtimeDecks)) {
  if (!deck.process_names) continue
  for (const name of deck.process_names) {
    if (seenProcessNames.has(name)) {
      runtimeLogger.warn(/* collision */)
    }
    seenProcessNames.set(name, [...(seenProcessNames.get(name) ?? []), deckId])
  }
}

// ✅ AFTER: Set for dedup — the actual value was never consumed
const seenProcessNames = new Set<string>()
for (const [deckId, deck] of Object.entries(runtimeDecks)) {
  if (!deck.process_names) continue
  for (const name of deck.process_names) {
    if (seenProcessNames.has(name)) {
      runtimeLogger.warn(/* collision */)
    }
    seenProcessNames.add(name)
  }
}
```

## Why This Matters

- **Dead allocations waste memory and signal confusion.** A future reader sees the `Map<string, string[]>` and reasonably assumes it's consumed elsewhere. They waste time searching for downstream references.
- **Sets signal intent.** `Set<string>` tells the reader "I only care about uniqueness." The type change alone communicates the actual purpose.
- **Every line of code should justify its existence.** An unused collection is noise that increases the cognitive cost of reading the constructor.

## When to Apply

- During code review: if a collection is built but never read from after construction, flag it.
- When transitioning from a prototype to production: remove scaffolding that served its debugging purpose but was never integrated into the actual logic.
- If all you need is dedup tracking for warnings, use `Set`, not `Map` with an unused value type.

## Examples

```typescript
// Tell: Map built with a complex value type, but value is never read
const audit = new Map<string, string[]>() // string[] unused
audit.set('foo', ['deck1'])

// Later, only .has() is called
if (audit.has('foo')) { ... } // no .get() anywhere

// Fix: Set is sufficient
const seen = new Set<string>()
seen.add('foo')
if (seen.has('foo')) { ... }
```

## Related

- [AGENTS.md Principle #2: Minimal Fix, Surgical Change](../../../../../AGENTS.md) — replace a Map with a Set when the value type is unused
