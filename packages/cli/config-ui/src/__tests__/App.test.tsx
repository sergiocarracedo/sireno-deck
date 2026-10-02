/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest"

import { fireEvent, render, screen } from "@testing-library/react"

import { App } from "../App"
import { SidePanel } from "../SidePanel"

describe("App (emulator)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("uses a background only for the current sidebar item and on hover", () => {
    render(<SidePanel activeSection="config" onSelect={() => undefined} />)
    expect(screen.getByTestId("side-panel-config")).toHaveClass(
      "bg-surface-secondary",
      "hover:bg-surface-secondary",
    )
    expect(screen.getByTestId("side-panel-about")).toHaveClass(
      "bg-transparent",
      "hover:bg-surface-secondary",
    )
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

  it("hides the side panel and header when ?deckOnly=1", () => {
    window.history.replaceState(null, "", "/?deckOnly=1")
    render(<App />)
    expect(screen.queryByTestId("side-panel")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Visual editor" }),
    ).not.toBeInTheDocument()
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
