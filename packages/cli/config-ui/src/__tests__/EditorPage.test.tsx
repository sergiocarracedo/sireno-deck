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
  buttonSchemas: {
    "core:action": {
      type: "object",
      properties: { command: { type: "string" } },
    },
  },
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
      name: "test-addon",
      path: "builtin",
      internal: false,
      source: "builtin",
      buttonTypes: [{ type: "test-addon:action", internal: false }],
      defaultButton: "test-addon:action",
      decks: [
        {
          id: "test-addon:generated",
          sourceId: "test-addon:generated",
          generated: true,
          pageIndex: 0,
          isOverlay: true,
          paginated: false,
          buttons: [{ type: "test-addon:action", position: 0 }],
          internal: false,
          addonIndex: 3,
          overrideKey: "test-addon:generated",
          overrideFields: ["name", "icon", "autoShow", "trigger", "config"],
        },
      ],
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
    render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }))
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 2" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    fireEvent.click(screen.getByRole("button", { name: "Paste button" }))

    const message = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      mutation?: { button?: unknown }
    }
    expect(message.mutation?.button).toEqual({
      type: "core:action",
      config: { command: "date" },
      position: 2,
    })
  })

  it("saves selected config using the update mutation", () => {
    const ws = client()
    const view = render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    fireEvent.change(screen.getByLabelText("Command"), {
      target: { value: "whoami" },
    })
    const validation = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      requestId: string
    }
    view.rerender(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        validation={{
          requestId: validation.requestId,
          valid: true,
          errors: [],
        }}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Save button config" }))

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

    expect(screen.getByRole("tab", { name: "Buttons" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(
      screen.getByRole("button", { name: "test-addon:action" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "Themes" }))

    expect(screen.getByRole("tab", { name: "Themes" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByText("default")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "test-addon:action" }),
    ).not.toBeInTheDocument()
  })

  it("targets generated deck overrides with the addon owner", () => {
    const ws = client()
    render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        addonInventory={inventory}
      />,
    )
    fireEvent.click(screen.getByRole("tab", { name: "Decks" }))
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit override for test-addon:generated",
      }),
    )

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toEqual({
      kind: "set-addon-deck-override",
      addonIndex: 3,
      deckId: "test-addon:generated",
      override: {},
    })
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

  it("keeps the selected button stable during preview interaction", () => {
    const ws = client()
    render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    fireEvent.pointerDown(screen.getByTestId("deck-key-1"))
    fireEvent.pointerUp(screen.getByTestId("deck-key-1"))

    expect(screen.getByLabelText("Command")).toHaveValue("date")
    expect(ws.sent.some((message) => message.includes("editor-mutate"))).toBe(
      false,
    )
  })

  it("inserts a palette button at an empty selected position", () => {
    const ws = client()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        addonInventory={inventory}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 4" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    fireEvent.click(screen.getByRole("button", { name: "test-addon:action" }))

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toEqual({
      kind: "add",
      deckId: "main",
      index: 2,
      button: { type: "test-addon:action", config: {}, position: 4 },
    })
  })

  it("renders deck fields and dispatches an immutable-id deck update", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Updated deck" },
    })
    fireEvent.change(screen.getByLabelText("Columns"), {
      target: { value: "4" },
    })
    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "2" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save deck" }))

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toEqual({
      kind: "update-deck",
      deckId: "main",
      deck: {
        name: "Updated deck",
        columns: 4,
        rows: 2,
        buttons: state.config.decks.main.buttons,
      },
    })
  })

  it("dispatches top-level button fields without changing its position", () => {
    const ws = client()
    render(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Run command" },
    })
    fireEvent.change(screen.getByLabelText("Color"), {
      target: { value: "green" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save button" }))

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toEqual({
      kind: "update",
      deckId: "main",
      index: 0,
      button: {
        type: "core:action",
        config: { command: "date" },
        label: "Run command",
        buttonColor: "green",
      },
    })
  })

  it("keeps generated buttons read-only", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={{
          ...state,
          config: {
            decks: {
              main: {
                buttons: [{ type: "test:generated", generated: true }],
              },
            },
          },
        }}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))

    expect(screen.getByLabelText("Label")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Save button" })).toBeDisabled()
    expect(
      screen.getByText("Generated buttons are owned by their addon."),
    ).toBeInTheDocument()
  })
})
