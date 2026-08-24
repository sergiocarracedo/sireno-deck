import { describe, expect, it } from "vitest"

import { manifest } from "../manifest"

describe("coding-agents manifest", () => {
  it("exports a valid AddonManifestV1", () => {
    expect(manifest.apiVersion).toBe(1)
    expect(manifest.name).toBe("coding-agents")
    expect(Object.keys(manifest.buttonTypes)).toContain("coding-agents:summary")
    expect(Object.keys(manifest.buttonTypes)).toContain("coding-agents:agent")
  })

  it("exposes globalService with methods, pollers, subscriptions, lifecycle", () => {
    expect(manifest.globalService).toBeDefined()
    expect(manifest.globalService?.methods).toBeDefined()
    expect(manifest.globalService?.pollers).toBeDefined()
    expect(manifest.globalService?.subscriptions).toBeDefined()
    expect(manifest.globalService?.onLoad).toBeDefined()
    expect(manifest.globalService?.onUnload).toBeDefined()
  })

  it("button types declare gesture handlers", () => {
    const summary = manifest.buttonTypes["coding-agents:summary"]
    expect(summary?.service.gestureHandlers).toContain("tap")
    const agent = manifest.buttonTypes["coding-agents:agent"]
    expect(agent?.service.gestureHandlers).toContain("tap")
    expect(agent?.service.gestureHandlers).toContain("hold")
  })

  it("declares a dynamic deck", () => {
    expect(manifest.decks).toBeDefined()
    const entry = manifest.decks?.[0] as unknown as {
      createDecks?: unknown
    }
    expect(typeof entry?.createDecks).toBe("function")
  })

  it("declares requirement checks", () => {
    expect(manifest.checks).toBeDefined()
    expect(manifest.checks?.length).toBe(2)
    expect(manifest.checks?.[0]?.name).toBe("opencode-reachable")
    expect(manifest.checks?.[1]?.name).toBe("claude-code-projects-readable")
  })

  it("channel name matches the shared constant", async () => {
    const { CHANNEL } = await import("../shared/state")
    const poller = manifest.globalService?.pollers?.[0]
    expect(poller?.channel).toBe(CHANNEL)
  })
})
