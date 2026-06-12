---
title: Opt-in env-var-gated instrumentation pattern (SIRENO_PROFILE=1)
date: 2026-06-11
category: best-practices
module: packages/cli/src/render/browser-renderer.ts
problem_type: best_practice
severity: medium
tags: instrumentation, profiling, performance, env-var, hrtime.bigint, markHop
---

# Opt-in env-var-gated instrumentation pattern (SIRENO_PROFILE=1)

## Context

When investigating a performance issue, you need to measure per-hop timings in a long-running service (Stream Deck CLI daemon). The naive approach of adding `console.log("hop X")` calls adds overhead even when not debugging, and pollutes output for normal users.

The pattern: gate all instrumentation on an environment variable, use high-precision timing, and emit structured (JSON) output that's machine-parseable.

## Guidance

Three components:

1. **Module-level gate** — a single `const ENABLED = process.env.SIRENO_PROFILE === "1"` check. Read once at module load (or once per `createSomething()` factory call).

2. **Helper function** that returns early when disabled. Keep the call site as cheap as possible — a single function call with a name argument.

3. **Per-renderer (not per-module) state** — the timestamp Map should live in the closure, not at module scope. Multiple instances (future multi-device support) would otherwise interleave their hop deltas.

```ts
// Module-level
const SIRENO_PROFILE_ENABLED = process.env.SIRENO_PROFILE === "1"

// In the createBrowserRenderer closure (NOT at module scope)
const profilePrevTimestamps = new Map<string, bigint>()
function markHop(name: string): void {
  if (!SIRENO_PROFILE_ENABLED) return
  const now = process.hrtime.bigint()
  const prev = profilePrevTimestamps.get(name) ?? now
  profilePrevTimestamps.set(name, now)
  const deltaMs = Number(now - prev) / 1_000_000
  process.stdout.write(JSON.stringify({ hop: name, ms: deltaMs }) + "\n")
}
```

Call sites:
```ts
markHop("runCaptureLoop.tick")
markHop("screenshot.before")
const capture = await activePage.screenshot(...)
markHop("screenshot.after")
```

Usage:
```bash
# Default: zero overhead, no output
pnpm cli:dev start

# Profile: JSON lines on stdout, one per hop
SIRENO_PROFILE=1 pnpm cli:dev start | jq -c 'select(.hop == "screenshot.after")'
```

## Why This Matters

- **Zero overhead in production** — the early return in `markHop` is a single `if` check. No string formatting, no JSON serialization, no I/O.
- **Structured output** — JSON lines on stdout are machine-parseable. `jq` can extract specific hops, `grep` can count, `awk` can compute stats. Plain `console.log` with format strings requires post-processing.
- **High precision** — `process.hrtime.bigint()` gives nanosecond resolution. `Date.now()` only gives milliseconds, which is too coarse for sub-millisecond hops.
- **Composable** — multiple invocations can `tee` their logs and a downstream tool can correlate by timestamp.

## When to Apply

- Investigating ANY performance issue in a long-running service (daemon, server, watch loop)
- Adding diagnostic logging that should not affect production behavior
- Building a "debug mode" feature that users can opt into
- Avoiding the `if (DEBUG) console.log(...)` pattern at every call site (DRY + lower cognitive overhead)

## Examples

**Bad — scattered conditionals:**
```ts
if (DEBUG) console.log("hop tick", Date.now())
// ... later ...
if (DEBUG) console.log("hop screenshot", Date.now())
```

**Bad — millisecond precision:**
```ts
const t0 = Date.now()
await doWork()
console.log(`hop took ${Date.now() - t0}ms`)
```

**Good — single helper, JSON output, closure-scoped state:**
```ts
const profilePrevTimestamps = new Map<string, bigint>()
function markHop(name: string): void {
  if (!SIRENO_PROFILE_ENABLED) return
  const now = process.hrtime.bigint()
  const prev = profilePrevTimestamps.get(name) ?? now
  profilePrevTimestamps.set(name, now)
  process.stdout.write(JSON.stringify({ hop: name, ms: Number(now - prev) / 1_000_000 }) + "\n")
}
```

## Related

- `gesture-state-spread-not-replace-2026-06-10.md` — instrumentation should read elapsed time, never mutate runtime state
- `skip-screenshot-when-html-unchanged-2026-06-11.md` — Phase 58 fix that used this instrumentation to identify the bottleneck
- `workflow-issues/new-tests-pass-in-isolation-fail-in-full-file-2026-06-04.md` — Phase 57 lesson about not modifying production code for tests
