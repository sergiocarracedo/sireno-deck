---
title: "ReferenceError: preflightResult is not defined in real mode pipeline"
date: 2026-07-01
category: runtime-errors
module: cli/commands/run
problem_type: runtime_error
severity: high
tags: [preflight, destructuring, real-mode, themeDir]
---

# ReferenceError: preflightResult is not defined in real mode pipeline

## Problem

Running `pnpm dev start` on real hardware crashed immediately with:

```
ReferenceError: preflightResult is not defined
```

The daemon started, connected to the Stream Deck, but crashed before rendering
anything. The emulator mode (`--emulator`) was unaffected.

## Symptoms

- CLI crashes on real hardware before frontend spawns
- `ReferenceError: preflightResult is not defined` in logs
- `themeDir` was being passed as `preflightResult.themeDir` but
  `preflightResult` was never a variable in scope

## What Didn't Work

The emulator path was investigated first because it worked — it immediately
returns via `runEmulatorPipeline`, never reaching the failing code. This
misleadingly suggested the issue was in emulator-specific code rather than
the preflight destructuring.

## Solution

The `preflight()` call at line 320 of `run.ts` was only partially destructured:

```typescript
// BEFORE — missing themeDir
const {
  device,
  frontendUrl: configuredUrl,
  runtime,
  decks,
  providers,
} = await preflight(options)
```

`themeDir` was referenced later as `preflightResult.themeDir`, which is not
a valid variable. Fixed by adding `themeDir` to the destructuring and updating
the reference:

```typescript
// AFTER
const {
  device,
  frontendUrl: configuredUrl,
  runtime,
  decks,
  providers,
  themeDir,  // <— added
} = await preflight(options)
```

And the reference at `spawnFrontendVite` call site changed from
`preflightResult.themeDir` to `themeDir`.

## Why This Works

`preflight()` returns a `PreflightResult` object that includes `themeDir`
among its fields. The destructuring omitted it, so TypeScript never caught
the subsequent reference to `preflightResult.themeDir` — it was a plain
ReferenceError at runtime, not a type error.

## Prevention

- Avoid short-circuiting `emulator` vs `real` paths in mental models when
  debugging; validate both paths cover the same setup code
- Destructuring only the fields you need from a result object is fine, but
  every reference to that result must use only the destructured names
- A test that boots both emulator and real pipelines (without hardware) would
  catch this class of bug

## Related

- `packages/cli/src/cli/commands/run.ts` — `runRealModePipeline` and `preflight`
