import { readFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"

import { loadThemeFromPath } from "../loader"
import { ThemeJsonManifestSchema } from "../manifest"

const path = fileURLToPath(
  new URL("../../../../themes/folio/sirenodeck.json", import.meta.url),
)

describe("Folio third-party theme", () => {
  it("has a valid installable theme manifest and semantic variants", () => {
    const parsed = ThemeJsonManifestSchema.safeParse(
      JSON.parse(readFileSync(path, "utf8")),
    )
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.name).toBe("folio")
    for (const key of [
      "default",
      "error",
      "warning",
      "success",
      "blue",
      "green",
      "purple",
      "cyan",
      "magenta",
      "amber",
      "lime",
    ]) {
      expect(parsed.data.variants[key]).toBeDefined()
    }
  })

  it("loads from the directory path users set as theme and generates CSS", () => {
    const registry = new AddonRegistry()
    const loaded = loadThemeFromPath(registry, dirname(path))
    expect(registry.getTheme("folio")).toEqual(loaded.theme)
    expect(loaded.getCss()).toContain("#e9e8e3")
  })
})
