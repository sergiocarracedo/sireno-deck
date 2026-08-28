import { describe, expect, it } from "vitest"

import { globalService } from "../global-entry"
import { manifest } from "../manifest"

describe("coding-agents manifest", () => {
  it("exports a valid AddonManifestV1", () => {
    expect(manifest.apiVersion).toBe(1)
    expect(manifest.name).toBe("coding-agents")
    expect(Object.keys(manifest.buttonTypes)).toContain("coding-agents:summary")
    expect(Object.keys(manifest.buttonTypes)).toContain("coding-agents:agent")
  })

  it("keeps the manifest browser-safe (no node-only fields)", () => {
    expect("globalService" in manifest).toBe(false)
  })

  it("exposes globalService with methods, pollers, subscriptions, lifecycle", () => {
    expect(globalService).toBeDefined()
    expect(globalService.methods).toBeDefined()
    expect(globalService.pollers).toBeDefined()
    expect(globalService.subscriptions).toBeDefined()
    expect(globalService.onLoad).toBeDefined()
    expect(globalService.onUnload).toBeDefined()
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
    expect(manifest.checks?.length).toBe(3)
    expect(manifest.checks?.[0]?.name).toBe("opencode-reachable")
    // ponytail: distinguishes "opencode CLI not on $PATH" from
    // "installed but no server running" (spawn gate in registry.ts).
    expect(manifest.checks?.[1]?.name).toBe("opencode-installed")
    expect(manifest.checks?.[2]?.name).toBe("claude-code-projects-readable")
  })

  it("channel name matches the shared constant", async () => {
    const { CHANNEL } = await import("../shared/state")
    const poller = globalService.pollers?.[0]
    expect(poller?.channel).toBe(CHANNEL)
  })
})
