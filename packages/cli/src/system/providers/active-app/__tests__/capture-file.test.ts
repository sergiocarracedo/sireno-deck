import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { createCaptureFileActiveAppProvider } from "../capture-file"

describe("capture-file active app provider", () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true })
  })

  it("reads and publishes active-app changes from the capture timeline", async () => {
    const directory = mkdtempSync(join(tmpdir(), "sirenodeck-capture-app-"))
    directories.push(directory)
    const path = join(directory, "active-app.json")
    writeFileSync(path, "null")
    const provider = createCaptureFileActiveAppProvider(path)
    const update = new Promise((resolve) => provider.subscribe(resolve))

    writeFileSync(
      path,
      JSON.stringify({
        name: "chromium",
        windowTitle: "Google Meet",
        processId: null,
      }),
    )

    await expect(update).resolves.toEqual({
      name: "chromium",
      windowTitle: "Google Meet",
      processId: null,
    })
    await provider.stop()
  })
})
