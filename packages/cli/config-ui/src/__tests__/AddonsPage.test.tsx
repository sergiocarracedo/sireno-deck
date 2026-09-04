/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { AddonsPage } from "../pages/AddonsPage"

const inventory = {
  addons: [
    {
      name: "core",
      path: "/abs/builtin/core",
      internal: true,
      source: "json",
      buttonTypes: [
        { type: "core:back", internal: false },
        { type: "core:settings-entry", internal: false },
        { type: "core:overlay-toggle", internal: false },
      ],
      decks: [
        {
          id: "main",
          isOverlay: false,
          paginated: false,
          buttons: 3,
          internal: false,
        },
        {
          id: "core:lock",
          isOverlay: false,
          paginated: false,
          buttons: 3,
          internal: false,
        },
      ],
    },
    {
      name: "weather",
      path: "/abs/addons/weather",
      internal: false,
      source: "json",
      buttonTypes: [{ type: "weather:weather", internal: false }],
      decks: [
        {
          id: "weather:overlay",
          isOverlay: true,
          paginated: true,
          buttons: 2,
          internal: false,
        },
      ],
    },
    {
      name: "emoji-selector",
      path: "/abs/builtin/emoji-selector",
      internal: false,
      source: "json",
      buttonTypes: [{ type: "emoji-selector:emoji", internal: false }],
      decks: [
        {
          id: "emoji-selector-smileys-p1",
          isOverlay: false,
          paginated: true,
          buttons: 13,
          internal: false,
        },
        {
          id: "emoji-selector-smileys-p2",
          isOverlay: false,
          paginated: true,
          buttons: 13,
          internal: false,
        },
        {
          id: "emoji-selector-favorites",
          isOverlay: false,
          paginated: true,
          buttons: 6,
          internal: false,
        },
      ],
    },
    {
      name: "internal-settings",
      path: "/abs/builtin/internal-settings",
      internal: true,
      source: "json",
      buttonTypes: [
        { type: "internal-settings:brightness-up", internal: true },
        { type: "internal-settings:brightness-down", internal: true },
      ],
      decks: [
        {
          id: "internal-settings:settings",
          isOverlay: false,
          paginated: false,
          buttons: 0,
          internal: true,
        },
      ],
    },
  ],
}

describe("AddonsPage", () => {
  it("renders loading state when inventory is null", () => {
    render(<AddonsPage addonInventory={null} />)
    expect(screen.getByText("loading…")).toBeInTheDocument()
  })

  it("renders addon name as plain title and path as plain text", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("core")
    expect(container.textContent).toContain("weather")
    expect(container.textContent).toContain("/abs/builtin/core")
    expect(container.textContent).toContain("/abs/addons/weather")
  })

  it("strips addon prefix from chip labels but keeps full id in title", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("back")
    expect(container.textContent).toContain("settings-entry")
    expect(container.textContent).toContain("overlay-toggle")
    expect(container.textContent).toContain("emoji")
    expect(container.textContent).toContain("overlay")
    expect(container.textContent).toContain("lock")
  })

  it("groups paginated decks by base name and marks them paginated", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("smileys")
    expect(container.textContent).toContain("⠿")
    expect(container.textContent).not.toContain("emoji-selector-smileys-p1")
    expect(container.textContent).not.toContain("emoji-selector-smileys-p2")
  })

  it("marks overlay decks with overlay emoji", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("◐")
  })

  it("renders a legend with both chip kinds and modifier emojis", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    const legend = screen.getByTestId("addons-legend")
    expect(legend).toBeInTheDocument()
    expect(legend.textContent).toContain("deck")
    expect(legend.textContent).toContain("button")
    expect(legend.textContent).toContain("overlay")
    expect(legend.textContent).toContain("paginated")
    expect(legend.textContent).toContain("internal")
    expect(legend.textContent).toContain("builtin")
    expect(container.textContent).toContain("◐")
    expect(container.textContent).toContain("⠿")
    expect(container.textContent).toContain("🔒")
    expect(container.textContent).toContain("📦")
  })

  it("marks builtin addons with the package emoji on the h3", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("core📦".replace("📦", ""))
    const headings = container.querySelectorAll("h3")
    const core = Array.from(headings).find((h) =>
      h.textContent?.startsWith("core"),
    )
    expect(core?.textContent).toContain("📦")
    const weather = Array.from(headings).find((h) =>
      h.textContent?.startsWith("weather"),
    )
    expect(weather?.textContent).not.toContain("📦")
  })

  it("only marks per-element internal with 🔒, not all elements of a builtin addon", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    const coreSection = Array.from(container.querySelectorAll("section")).find(
      (s) => s.querySelector("h3")?.textContent?.startsWith("core"),
    )
    expect(coreSection).toBeDefined()
    const coreText = coreSection?.textContent ?? ""
    expect(coreText).not.toContain("back 🔒")
    expect(coreText).not.toContain("🔒back")
    expect(coreText).not.toContain("main 🔒")
  })

  it("hides internal buttons and decks", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    const section = Array.from(container.querySelectorAll("section")).find(
      (s) =>
        s.querySelector("h3")?.textContent?.startsWith("internal-settings"),
    )
    expect(section).toBeDefined()
    expect(screen.queryByTitle("internal-settings:brightness-up")).toBeNull()
    expect(screen.queryByTitle("internal-settings:settings")).toBeNull()
  })
})
