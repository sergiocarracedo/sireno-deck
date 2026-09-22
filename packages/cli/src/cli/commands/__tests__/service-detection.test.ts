import { afterEach, describe, expect, it } from "vitest"

import { createIsUnderServiceManager } from "../spawn-daemon"
import { createIsServiceMode } from "@/util/logger"

// ponytail: both predicates must agree, and both were blind to modern launchd.
// The daemon launchd started therefore ran the interactive `start` path and
// re-bootstrapped itself into a KeepAlive crashloop.
const subjects = {
  isUnderServiceManager: createIsUnderServiceManager,
  isServiceMode: createIsServiceMode,
}

const ENV_KEYS = [
  "SIRENO_DAEMON_CHILD",
  "LAUNCH_JOB_NAME",
  "INVOCATION_ID",
  "XPC_SERVICE_NAME",
]
const saved = new Map<string, string | undefined>()
for (const k of ENV_KEYS) saved.set(k, process.env[k])

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

const clear = (): void => {
  for (const k of ENV_KEYS) delete process.env[k]
}

for (const [name, factory] of Object.entries(subjects)) {
  describe(name, () => {
    const never = factory({ isOrphaned: () => false })

    it("detects a launchd job by its XPC_SERVICE_NAME label", () => {
      clear()
      process.env["XPC_SERVICE_NAME"] = "sirenodeck"
      // Note: no orphan check needed — the label alone is conclusive.
      expect(never()).toBe(true)
    })

    it("ignores the '0' an interactive login shell carries", () => {
      clear()
      process.env["XPC_SERVICE_NAME"] = "0"
      expect(never()).toBe(false)
    })

    it("ignores another launchd job's label inherited by a terminal", () => {
      clear()
      process.env["XPC_SERVICE_NAME"] = "com.apple.Terminal"
      expect(never()).toBe(false)
    })

    it("is false in a plain shell", () => {
      clear()
      expect(never()).toBe(false)
    })
  })
}
