import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { loadConfig } from "../loader"

describe("website showcase config", () => {
  it("loads the isolated demo decks without a personal config", () => {
    const configPath = fileURLToPath(
      new URL("../../../../../demos/website-showcase.yml", import.meta.url),
    )
    const { config } = loadConfig({ configPath })
    expect(config.decks?.main?.buttons?.[0]).toMatchObject({
      type: "coding-agents:summary",
    })
    expect(Object.keys(config.decks ?? {})).toContain("demo-weather")
    expect(Object.keys(config.decks ?? {})).toContain("demo-media")
  })
})
