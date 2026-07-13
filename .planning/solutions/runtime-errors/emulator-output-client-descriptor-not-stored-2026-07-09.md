---
title: EmulatorOutputClient.init throws "selectDevice() must run first" despite runtime calling selectDevice()
date: 2026-07-09
category: runtime-errors
module: packages/cli/src/outputClient
problem_type: runtime_error
severity: critical
tags:
  [
    output-client,
    state-assignment,
    init-guard,
    regression-from-refactor,
    test-gap,
  ]
---

# EmulatorOutputClient.init throws "selectDevice() must run first" despite runner calling selectDevice()

## Problem

After commit `7b96d2c6` ("refactor: SOLID OutputClient — zero mode-branching in runner") rewrote `EmulatorOutputClient`, the CLI failed to start with:

```
07:51:19 ERROR (sireno-deck) background run failed
  Error: EmulatorOutputClient.init: selectDevice() must run first
```

The runner call order in `run.ts` (`listDevices → selectDevice → storeSelection → init`) was correct. The bug lived entirely inside the emulator impl.

## Symptoms

- CLI crashes immediately on `run` command when the active output is the emulator (and any test path that constructs an emulator output client and calls `init`).
- Real hardware path (`RealOutputClient`) was unaffected — its `selectDevice` correctly stored the descriptor.
- Error message points at `init`, misleadingly; the real defect is in `selectDevice`.

## What Didn't Work

- Reading the error message at face value — the guard fires inside `init`, but the bug is upstream in `selectDevice`.
- Assuming the runner code path had changed. Verifying `run.ts:448-457` confirmed the contract was honored by the runner.

## Solution

Two fixes inside `packages/cli/src/outputClient/emulator.ts:62-76` (`EmulatorOutputClient.selectDevice`):

1. **Store the selected descriptor on the instance** before returning — mirroring `RealOutputClient.selectDevice`:
   ```ts
   const match = devices.find((d) => d.id === savedId)
   if (match !== undefined) {
     this.descriptor = match
     return match
   }
   // fallback path
   const fallback = devices[0]
   if (fallback === undefined) {
     throw new Error("No devices available to select")
   }
   this.descriptor = fallback
   await this.storeSelection(fallback)
   return fallback
   ```
2. **Accept the `logger: pino.Logger` argument** the `OutputClient` interface mandates. TypeScript hid the contract violation via overload tolerance — the parameter was named but unused in body, so existing code that constructed it still compiled.

Plus a regression test in `packages/cli/src/outputClient/__tests__/emulator.test.ts`:

```ts
describe("EmulatorOutputClient.init", () => {
  it("does not throw descriptor-guard after selectDevice()", async () => {
    const client = new EmulatorOutputClient()
    await client.selectDevice(
      [
        {
          id: "emu",
          model: "mk2",
          keyCount: 15,
          label: "Emu",
          transport: "emulated",
        },
      ],
      null,
      silentLogger(),
    )
    await expect(client.init(/* minimal shape */)).rejects.not.toThrow(
      /selectDevice\(\) must run first/,
    )
  })
})
```

The downstream `spawnEmulatorVite` will reject in the unit env (no Vite daemon), which is fine — the regression test only needs to assert the descriptor guard does NOT fire first.

## Why This Works

- The `init()` guard `if (this.descriptor === null) throw ...` exists to fail fast when the contract `init()` depends on `selectDevice()` having stored a selection is broken. Fix the contract on the producing side (`selectDevice`) rather than the consuming side (`init`) because consumers have no other source of truth.
- The signature fix removes a silent TS footgun: TS variance allowed `EmulatorOutputClient` to drop the `logger` param because `selectDevice`'s interface was treated as bivariant via method-type inference. Adding the parameter explicitly makes the contract visible at call sites.

## Prevention

- **Test every public method in the order the contract requires.** Isolated unit tests on `selectDevice` masked the bug; an integration-style test (`selectDevice → init`) catches the state-storing path. Add a CI rule: if a class has a guarded method, a test must cover the call sequence that satisfies the guard.
- **When refactoring a SOLID/contract rewrite, walk the contract boundaries.** The OutputClient refactor added an `init()` guard for safety; the same review pass should have confirmed every impl honors the dependency (here: `selectDevice` stores what `init` reads).
- **`tsc` is not enough.** The missing `logger` param in the impl signature was caught by reading, not by the compiler. Add `noImplicitOverride`-style discipline to interface-implementor audits: every interface method, every impl method, line up.
- **`this.descriptor =` is the kind of side effect easy to forget.** When rewriting a class from scratch, audit the original for instance-state mutations inside each method.

## Related

- Commit `7b96d2c6` introduced the regression as part of a SOLID-correctness pass on `OutputClient`.
- Sibling `RealOutputClient.selectDevice` was the model the emulator should have mirrored — diffing the two would have surfaced the missing assignment immediately.
- `.planning/solutions/runtime-errors/runtime-provider-injection-via-methods-2026-07-09.md` covers the parallel "method vs runtime API" mismatch that surfaced in the same session; the pattern is "two complementary half-installed contracts in one repo."
</content>
