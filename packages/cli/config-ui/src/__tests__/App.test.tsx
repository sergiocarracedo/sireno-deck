/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest"

import { fireEvent, render, screen } from "@testing-library/react"

import { App } from "../App"

describe("App (emulator)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("renders the side panel and header by default", () => {
    render(<App />)
    expect(screen.getByTestId("side-panel")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Visual editor" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /fe:/i })).toHaveAttribute(
      "href",
      "http://127.0.0.1:5180",
    )
  })

  it("does not show the Decks sidebar menu item", () => {
    render(<App />)
    expect(screen.queryByTestId("side-panel-decks")).not.toBeInTheDocument()
  })

  it("shows the GPL license and warranty notice on the About page", () => {
    render(<App />)
    fireEvent.click(screen.getByTestId("side-panel-about"))

    expect(
      screen.getByRole("link", { name: "GNU GPL version 3 or later" }),
    ).toHaveAttribute("href", "https://www.gnu.org/licenses/gpl-3.0.html")
    expect(
      screen.getByText(/This program comes with no warranty/),
    ).toBeInTheDocument()
  })

  it("hides the side panel and header when ?deckOnly=1", () => {
    window.history.replaceState(null, "", "/?deckOnly=1")
    render(<App />)
    expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Visual editor" }),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId("deck-only-view")).toHaveTextContent(
      "Awaiting deck-config",
    )
  })

  it("shows the device-only view even when the URL hash points to config", () => {
    window.history.replaceState(null, "", "/?deckOnly=1#/config")
    render(<App />)

    expect(screen.getByTestId("deck-only-view")).toBeInTheDocument()
    expect(
      screen.queryByRole("tab", { name: "Editor" }),
    ).not.toBeInTheDocument()
  })

  it("fits the device-only view to the dynamic mobile viewport and safe areas", () => {
    window.history.replaceState(null, "", "/?deckOnly=1")
    render(<App />)

    expect(screen.getByTestId("deck-only-view")).toHaveClass("h-full", "w-full")
    expect(screen.getByTestId("fullscreen-toggle")).toHaveClass(
      "top-[calc(env(safe-area-inset-top)+0.75rem)]",
    )
  })

  it("shows a fullscreen toggle in deck-only mode", () => {
    window.history.replaceState(null, "", "/?deckOnly=1")
    render(<App />)
    expect(screen.getByTestId("fullscreen-toggle")).toBeInTheDocument()
  })

  it("updates the shell title when changing configuration views", () => {
    render(<App />)

    fireEvent.click(screen.getByRole("tab", { name: "Config" }))

    expect(screen.getByRole("heading", { name: "Config" })).toBeInTheDocument()
  })
})
