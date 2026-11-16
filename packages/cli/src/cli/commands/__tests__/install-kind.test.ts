import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { expect, it, vi } from "vitest"

vi.mock("execa", () => ({ execa: vi.fn().mockResolvedValue({}) }))
vi.mock("../../package-manager", () => ({
  assertPackageManager: vi.fn(),
  detectPackageManager: () => "npm",
  packageManagerArgs: () => [],
  globalPackageRoot: () => undefined,
}))
import { installPackage } from "../install"

it("refuses a theme under addon install without changing config", async () => {
  const dir = mkdtempSync(join(tmpdir(), "install-kind-"))
  try {
    const root = join(dir, "node_modules/example")
    mkdirSync(root, { recursive: true })
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "example", version: "1.0.0" }),
    )
    writeFileSync(
      join(root, "sirenodeck.json"),
      JSON.stringify({ kind: "theme" }),
    )
    const config = join(dir, "config.yml")
    writeFileSync(config, "decks: {}\n")
    await expect(
      installPackage({ packageName: "example", config, expectedKind: "addon" }),
    ).rejects.toThrow("not an addon")
    expect(readFileSync(config, "utf8")).toBe("decks: {}\n")
    await installPackage({ packageName: "example", config })
    expect(readFileSync(config, "utf8")).toContain("theme: example")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
