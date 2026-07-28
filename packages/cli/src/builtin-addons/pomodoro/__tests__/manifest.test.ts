import { describe, expect, it } from "vitest"

import { manifest } from "../index"

describe("pomodoro manifest", () => {
  it("exports a valid AddonManifestV1", () => {
    expect(manifest.apiVersion).toBe(1)
    expect(manifest.name).toBe("pomodoro")
    expect(Object.keys(manifest.buttonTypes)).toContain("pomodoro:pomodoro")
  })

  it("exposes globalService with methods and pollers", () => {
    expect(manifest.globalService).toBeDefined()
    expect(manifest.globalService?.methods).toBeDefined()
    expect(manifest.globalService?.pollers).toBeDefined()
    expect(manifest.globalService?.onLoad).toBeDefined()
    expect(manifest.globalService?.onUnload).toBeDefined()
  })

  it("pomodoro:pomodoro has a frontend and service", () => {
    const def = manifest.buttonTypes["pomodoro:pomodoro"]
    expect(def).toBeDefined()
    expect(def?.frontend).toBeDefined()
    expect(def?.service).toBeDefined()
    expect(def?.service.gestureHandlers).toContain("tap")
  })
})
