import { chmodSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  globalPackageRoot,
  packageManagerArgs,
  packageManagerProbeTimeoutMs,
  probeGlobalPackageRoots,
} from "../package-manager"

describe("packageManagerArgs", () => {
  it.each([
    ["pnpm", ["add", "--global", "demo"]],
    ["npm", ["install", "--global", "demo"]],
    ["yarn", ["global", "add", "demo"]],
  ] as const)("builds global %s arguments", (manager, expected) => {
    expect(packageManagerArgs(manager, "demo", true)).toEqual(expected)
  })

  it("uses add commands for local packages", () => {
    expect(packageManagerArgs("pnpm", "demo", false)).toEqual([
      "add",
      "--save-exact",
      "demo",
    ])
  })
})

/**
 * Put a fake `pnpm` at the front of `PATH`. A corrupt pnpm shim that re-`exec`s
 * itself once hung daemon startup indefinitely: `execFileSync` has no timeout of
 * its own, so the probe never came back and the deck never lit up. These tests
 * stand in a manager that never answers and one that answers wrongly, and pin
 * the behaviour the daemon depends on — the probe always returns.
 */
const withFakePnpm = (script: string): void => {
  const dir = mkdtempSync(join(tmpdir(), "sirenodeck-pm-"))
  const bin = join(dir, "pnpm")
  writeFileSync(bin, script)
  chmodSync(bin, 0o755)
  process.env["PATH"] = `${dir}:${process.env["PATH"] ?? ""}`
}

describe("package manager probes", () => {
  const originalPath = process.env["PATH"]
  const originalTimeout = process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"]

  afterEach(() => {
    process.env["PATH"] = originalPath
    if (originalTimeout === undefined)
      delete process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"]
    else process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = originalTimeout
  })

  it("gives up on a package manager that never answers", () => {
    process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = "300"
    withFakePnpm("#!/bin/sh\nsleep 30\n")

    const started = Date.now()
    const probe = probeGlobalPackageRoots()

    expect(probe.timedOut).toContain("pnpm")
    expect(probe.roots).not.toContain("")
    expect(Date.now() - started).toBeLessThan(10_000)
  })

  it("reports no root, and no timeout, for a manager that simply declines", () => {
    process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = "3000"
    withFakePnpm("#!/bin/sh\necho 'not in PATH' >&2\nexit 1\n")

    const probe = probeGlobalPackageRoots()

    expect(probe.timedOut).not.toContain("pnpm")
    expect(globalPackageRoot("pnpm")).toBeNull()
  })

  it("falls back to the default deadline when the override is unusable", () => {
    process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = "nonsense"
    expect(packageManagerProbeTimeoutMs()).toBe(10_000)

    process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = "0"
    expect(packageManagerProbeTimeoutMs()).toBe(10_000)

    process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"] = "250"
    expect(packageManagerProbeTimeoutMs()).toBe(250)
  })
})
