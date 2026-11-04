import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, sep } from "node:path"
import { describe, expect, it } from "vitest"
import { createAddonDataDirectory } from "../data-directory"

describe("addon data directories", () => {
  it("isolates identities, including path-like names, and survives recreation", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-data-"))
    try {
      const first = await createAddonDataDirectory("../calendar", root)()
      const second = await createAddonDataDirectory("calendar", root)()
      expect(first).not.toBe(second)
      expect(first.startsWith(join(root, "addons") + sep)).toBe(true)
      await writeFile(join(first, "state"), "saved")
      expect(await createAddonDataDirectory("../calendar", root)()).toBe(first)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("reports filesystem failures instead of falling back", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-data-"))
    try {
      await writeFile(join(root, "addons"), "not a directory")
      await expect(
        createAddonDataDirectory("calendar", root)(),
      ).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it.skipIf(process.platform === "win32")(
    "rejects a symlinked addon directory",
    async () => {
      const root = await mkdtemp(join(tmpdir(), "sireno-data-"))
      try {
        await symlink(root, join(root, "addons"))
        await expect(
          createAddonDataDirectory("calendar", root)(),
        ).rejects.toThrow()
      } finally {
        await rm(root, { recursive: true, force: true })
      }
    },
  )
})
