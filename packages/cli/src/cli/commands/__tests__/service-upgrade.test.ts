import { describe, expect, it } from "vitest"
import { refreshStaleUnit } from "../service-manager"

describe("service upgrade", () => {
  it("updates a versioned Homebrew executable without changing custom unit options", () => {
    const unit =
      '[Service]\nExecStart="/old/node" "/brew/Cellar/sirenodeck/0.2.6/libexec/dist/main.mjs" start\nRestartSec=42\n'
    const updated = refreshStaleUnit(
      unit,
      "/brew/Cellar/sirenodeck/0.2.7/libexec/dist/main.mjs",
      "/new/node",
      () => true,
    )
    expect(updated).toContain(
      'ExecStart="/new/node" "/brew/Cellar/sirenodeck/0.2.7/libexec/dist/main.mjs" start',
    )
    expect(updated).toContain("RestartSec=42")
  })

  it("does not rewrite a live custom command", () => {
    const unit = '[Service]\nExecStart="/node" "/custom/dist/main.mjs" start\n'
    expect(
      refreshStaleUnit(unit, "/current/dist/main.mjs", "/node", () => true),
    ).toBe(unit)
  })
})
