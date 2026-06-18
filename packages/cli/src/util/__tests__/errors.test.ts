import { describe, expect, it } from "vitest"

import { ConfigValidationError } from "@/core/schemas"
import { formatConfigError } from "../errors"

describe("formatConfigError", () => {
  it("includes heading, file path, line number, suggestion, and problem message", () => {
    const error = new ConfigValidationError(
      "unknown key 'thme'",
      "/tmp/config.yml",
      12,
      "Remove 'thme' or rename it to 'theme'.",
    )

    const formatted = formatConfigError(error)

    expect(formatted).toContain("config error")
    expect(formatted).toContain("/tmp/config.yml")
    expect(formatted).toContain("unknown key 'thme'")
    expect(formatted).toContain("line:")
    expect(formatted).toContain("suggestion:")
    expect(formatted).toContain("rename it to 'theme'")
  })
})
