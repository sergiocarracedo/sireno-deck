import { describe, expect, it, vi } from "vitest"

import LauncherBackend from "../buttons/launcher/backend"

const makeCtx = (
  overrides: {
    config?: unknown
    publish?: (...args: unknown[]) => void
  } = {},
) => {
  const publish = overrides.publish ?? vi.fn()
  return {
    ctx: {
      config: overrides.config ?? {},
      buttonId: "b9",
      addonName: "emoji-selector",
      methods: Object.freeze({}),
      publish,
      executor: { run: vi.fn() } as never,
      signal: new AbortController().signal,
      store: { buttonScope: vi.fn() } as never,
    },
    publish,
  }
}

describe("emoji-selector launcher", () => {
  it("onTap publishes runtime:navigate-deck with emoji-selector deck id", async () => {
    const { ctx, publish } = makeCtx()
    await LauncherBackend.onTap!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "emoji-selector:emoji-selector",
      addToHistory: true,
    })
  })

  it("onTap works with empty config", async () => {
    const { ctx, publish } = makeCtx({ config: {} })
    await LauncherBackend.onTap!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "emoji-selector:emoji-selector",
      addToHistory: true,
    })
  })

  it("onTap ignores config (favorites are handled by the addon deck level)", async () => {
    const { ctx, publish } = makeCtx({
      config: { favorites: ["🦄", "🌈"] },
    })
    await LauncherBackend.onTap!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "emoji-selector:emoji-selector",
      addToHistory: true,
    })
  })
})
