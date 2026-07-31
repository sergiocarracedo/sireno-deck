import { readFileSync } from "node:fs"
import { resolve as resolvePath } from "node:path"

import { describe, expect, it } from "vitest"

describe("cli/package.json exports", () => {
  it("exposes the ui subpaths that 3rd-party themes import from", () => {
    const pkgPath = resolvePath(__dirname, "..", "..", "..", "package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      exports: Record<string, unknown>
    }
    const required = [
      "./ui",
      "./ui/ButtonFrame",
      "./ui/surfaces/IconLabelSurface",
      "./ui/surfaces/IconLabelProgressSurface",
      "./ui/surfaces/TemporaryErrorSurface",
      "./ui/primitives/Label",
      "./ui/primitives/Text",
    ]
    for (const subpath of required) {
      expect(pkg.exports[subpath], `missing export ${subpath}`).toBeDefined()
    }
  })
})
