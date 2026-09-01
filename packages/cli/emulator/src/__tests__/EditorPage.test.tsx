/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DEVICE_MODELS } from "@sirenodeck/cli"

import type { WsClient } from "../bridge"
import { EditorPage, type EditorState } from "../pages/EditorPage"
import type { AddonInventory } from "../pages/AddonsPage"

const state: EditorState = {
  revision: 4,
  config: {
    decks: {
      main: {
        name: "Main deck",
        buttons: [
          { type: "core:action", config: { command: "date" } },
          { type: "core:settings" },
        ],
      },
    },
  },
  sources: ["/tmp/config.yml", "/tmp/buttons.yaml", "/tmp/notes.txt"],
  canUndo: true,
}

const client = (): WsClient & { sent: string[] } => {
  const sent: string[] = []
  return {
    sent,
    send: (data) => sent.push(data),
    close: vi.fn(),
    status: () => "open",
    attemptCount: () => 0,
    lastError: () => null,
  }
}

const inventory: AddonInventory = {
  addons: [
    {
      name: "core",
      path: "builtin",
      internal: true,
      source: "builtin",
      buttonTypes: [{ type: "core:action", internal: false }],
      defaultButton: "core:action",
      decks: [],
    },
  ],
}

describe("EditorPage", () => {
  it("requests state and shows decks and YAML sources only", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)

    expect(JSON.parse(ws.sent[0] ?? "{}")).toEqual({
      type: "editor-state-request",
    })
    expect(screen.getByText("Main deck")).toBeInTheDocument()
    expect(screen.getByText("/tmp/buttons.yaml")).toBeInTheDocument()
    expect(screen.queryByText("/tmp/notes.txt")).not.toBeInTheDocument()
  })

  it("copies and pastes with the existing add mutation", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)
    fireEvent.click(screen.getByRole("button", { name: "Copy core:action" }))
    fireEvent.click(screen.getByRole("button", { name: "Paste button" }))

    const message = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      mutation?: { button?: unknown }
    }
    expect(message.mutation?.button).toEqual({
      type: "core:action",
      config: { command: "date" },
    })
  })

  it("saves selected JSON using the update mutation", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Edit button 1, core:action" }),
    )
    fireEvent.change(screen.getByLabelText("Button JSON"), {
      target: { value: '{"type":"core:action","config":{"command":"whoami"}}' },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save button" }))

    const message = JSON.parse(ws.sent.at(-1) ?? "{}") as { mutation?: unknown }
    expect(message.mutation).toEqual({
      kind: "update",
      deckId: "main",
      index: 0,
      button: { type: "core:action", config: { command: "whoami" } },
    })
  })

  it("switches the palette between addon types and themes", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={state}
        result={null}
        addonInventory={inventory}
      />,
    )

    expect(screen.getByRole("tab", { name: "Addons" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(
      screen.getByRole("button", { name: "core:action" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "Themes" }))

    expect(screen.getByRole("tab", { name: "Themes" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("default")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "core:action" }),
    ).not.toBeInTheDocument()
  })

  it("wires the existing DeckFrame into the editor preview", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )

    expect(screen.getByTestId("editor-preview")).toContainElement(
      screen.getByTestId("deck-frame"),
    )
    expect(screen.getByTitle("Deck Preview")).toHaveAttribute(
      "src",
      expect.stringContaining("device=mk2"),
    )
  })
})
