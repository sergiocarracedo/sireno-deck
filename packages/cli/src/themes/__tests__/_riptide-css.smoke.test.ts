import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { buildThemeCss } from "../css"
import { ThemeJsonManifestSchema } from "../manifest"

const here = dirname(fileURLToPath(import.meta.url))
const riptideDir = resolve(here, "../../../../themes/riptide")

describe("riptide manifest → emitted CSS", () => {
  it("parses riptide/sirenodeck.json and emits Bitcount Single @font-face", () => {
    const raw = readFileSync(resolve(riptideDir, "sirenodeck.json"), "utf8")
    const manifest = ThemeJsonManifestSchema.parse(JSON.parse(raw))
    const css = buildThemeCss(manifest, [])

    expect(manifest.typography.main_text.fontFamily).toBe("Bitcount Single")
    expect(manifest.typography.auxiliary_text.fontFamily).toBe(
      "Bitcount Single",
    )
    expect(css).toContain("font-family: 'Bitcount Single'")
    expect(css).toContain("font-weight: 300 800")
    expect(css).toContain("BitcountSingle-VariableFont_wght.woff2")
    expect(css).toContain("format('woff2')")
    expect(css).toContain("--sireno-font-main-family: 'Bitcount Single'")
    expect(css).toContain("--sireno-font-aux-family: 'Bitcount Single'")
    expect(css).toContain("--font-main: 'Bitcount Single'")
    expect(css).toContain("--font-aux: 'Bitcount Single'")
    expect(css).not.toContain("'IBM Plex Sans'")
    expect(css).toContain("'IBM Plex Mono'")
  })
})
