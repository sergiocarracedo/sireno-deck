import { describe, expect, it, vi } from "vitest"

import { openSettingsUrl } from "../open-settings"
import { ACCESSIBILITY_SETTINGS_URL } from "../types"

const executorReturning = (exitCode: number) => ({
  run: vi.fn(async () => ({ exitCode, stdout: "", stderr: "" })),
})

describe("openSettingsUrl", () => {
  it("shells out to `open` with the pane URL on darwin", async () => {
    const executor = executorReturning(0)
    const opened = await openSettingsUrl(
      executor,
      ACCESSIBILITY_SETTINGS_URL,
      "darwin",
    )
    expect(opened).toBe(true)
    expect(executor.run).toHaveBeenCalledWith("open", [
      ACCESSIBILITY_SETTINGS_URL,
    ])
  })

  it("is a no-op on non-darwin platforms", async () => {
    const executor = executorReturning(0)
    expect(
      await openSettingsUrl(executor, ACCESSIBILITY_SETTINGS_URL, "linux"),
    ).toBe(false)
    expect(executor.run).not.toHaveBeenCalled()
  })

  it("reports failure rather than throwing when `open` exits non-zero", async () => {
    const executor = executorReturning(1)
    expect(
      await openSettingsUrl(executor, ACCESSIBILITY_SETTINGS_URL, "darwin"),
    ).toBe(false)
  })

  it("reports failure rather than throwing when `open` is missing", async () => {
    const executor = {
      run: vi.fn(async () => {
        throw new Error("ENOENT")
      }),
    }
    expect(
      await openSettingsUrl(executor, ACCESSIBILITY_SETTINGS_URL, "darwin"),
    ).toBe(false)
  })

  it("targets the Accessibility pane, not the Privacy & Security root", () => {
    expect(ACCESSIBILITY_SETTINGS_URL).toContain("Privacy_Accessibility")
  })
})
