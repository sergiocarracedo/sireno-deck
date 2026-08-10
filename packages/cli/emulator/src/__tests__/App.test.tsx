/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest"

import { render, screen } from "@testing-library/react"

import { App } from "../App"

describe("App (emulator)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("renders the side panel and header by default", () => {
    render(<App />)
    expect(screen.getByTestId("side-panel")).toBeInTheDocument()
    expect(screen.getByTestId("deck-header")).toBeInTheDocument()
  })

  it("hides the side panel and header when ?deckOnly=1", () => {
    window.history.replaceState(null, "", "/?deckOnly=1")
    render(<App />)
    expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument()
    expect(screen.queryByTestId("deck-header")).not.toBeInTheDocument()
  })
})
