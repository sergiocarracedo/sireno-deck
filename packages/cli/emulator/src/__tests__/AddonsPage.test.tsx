/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { AddonsPage } from "../pages/AddonsPage"

describe("AddonsPage", () => {
  it("renders loading state when addonInventory is null", () => {
    render(<AddonsPage addonInventory={null} />)
    expect(screen.getByText("loading…")).toBeInTheDocument()
  })

  it("renders addon sections from inventory", () => {
    const inventory = {
      addons: [
        {
          name: "test-addon",
          buttonTypes: ["test/type-a", "test/type-b"],
          defaultButton: null,
        },
      ],
    }
    render(<AddonsPage addonInventory={inventory} />)
    expect(screen.getByTestId("addons-page")).toBeInTheDocument()
    expect(screen.getByText("test-addon")).toBeInTheDocument()
    expect(screen.getByText("test/type-a")).toBeInTheDocument()
    expect(screen.getByText("test/type-b")).toBeInTheDocument()
  })

  it("renders multiple addons", () => {
    const inventory = {
      addons: [
        { name: "addon-alpha", buttonTypes: ["alpha/a"], defaultButton: null },
        { name: "addon-beta", buttonTypes: ["beta/b"], defaultButton: null },
      ],
    }
    render(<AddonsPage addonInventory={inventory} />)
    expect(screen.getByText("addon-alpha")).toBeInTheDocument()
    expect(screen.getByText("addon-beta")).toBeInTheDocument()
  })

  it("marks default button type with [default] badge", () => {
    const inventory = {
      addons: [
        {
          name: "defaults-addon",
          buttonTypes: ["defaults/x", "defaults/y"],
          defaultButton: "defaults/y",
        },
      ],
    }
    render(<AddonsPage addonInventory={inventory} />)
    expect(screen.getByText("defaults/y")).toBeInTheDocument()
    expect(screen.getByText("[default]")).toBeInTheDocument()
  })

  it("renders empty addons array as empty page", () => {
    const inventory = { addons: [] }
    render(<AddonsPage addonInventory={inventory} />)
    expect(screen.getByTestId("addons-page")).toBeInTheDocument()
    expect(screen.queryByRole("section")).not.toBeInTheDocument()
  })
})
