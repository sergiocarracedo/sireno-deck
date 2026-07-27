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
      buttonTypes: ["core:back", "core:settings-entry", "core:overlay-toggle"],
      decks: [
        { id: "main", isOverlay: false, paginated: false, buttons: 3, internal: false },
        { id: "core:lock", isOverlay: false, paginated: false, buttons: 3, internal: false },
      ],
    },
    {
      name: "weather",
      path: "/abs/addons/weather",
      internal: false,
      buttonTypes: ["weather:weather"],
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
      buttonTypes: ["emoji-selector:emoji"],
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

  it("renders grouped decks and button types", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("main")
    expect(container.textContent).toContain("core:lock")
    expect(container.textContent).toContain("weather:overlay")
    expect(container.textContent).toContain("core:back")
    expect(container.textContent).toContain("weather:weather")
    expect(container.textContent).toContain("core:settings-entry")
    expect(container.textContent).toContain("🔒")
  })

  it("groups paginated decks by base name and marks them paginated", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("emoji-selector-smileys")
    expect(container.textContent).toContain("⠿")
    expect(container.textContent).not.toContain("emoji-selector-smileys-p1")
    expect(container.textContent).not.toContain("emoji-selector-smileys-p2")
  })

  it("marks overlay decks with overlay emoji", () => {
    const { container } = render(<AddonsPage addonInventory={inventory} />)
    expect(container.textContent).toContain("weather:overlay")
    expect(container.textContent).toContain("◐")
  })

  it("renders a legend above the addon flow", () => {
    render(<AddonsPage addonInventory={inventory} />)
    expect(screen.getByTestId("addons-legend")).toBeInTheDocument()
    expect(screen.getByTestId("addons-legend").textContent).toMatch(
      /internal|deck|overlay|button/i,
    )
  })
})
