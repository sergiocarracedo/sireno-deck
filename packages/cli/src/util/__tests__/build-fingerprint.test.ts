import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { fingerprintBuildInputs } from "../build-fingerprint"

describe("fingerprintBuildInputs", () => {
  it("changes when a component's source changes but not when tests change", () => {
    const root = mkdtempSync(join(tmpdir(), "sireno-fingerprint-"))
    try {
      for (const dir of ["src", "frontend", "config-ui"])
        mkdirSync(join(root, dir))
      writeFileSync(join(root, "package.json"), '{"version":"1"}')
      writeFileSync(join(root, "src", "main.ts"), "first")
      const first = fingerprintBuildInputs(root)
      writeFileSync(join(root, "src", "main.test.ts"), "test")
      expect(fingerprintBuildInputs(root)).toBe(first)
      writeFileSync(join(root, "frontend", "main.ts"), "second")
      expect(fingerprintBuildInputs(root)).not.toBe(first)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
