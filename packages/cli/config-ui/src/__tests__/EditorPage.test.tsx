/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DEVICE_MODELS } from "@sirenodeck/sirenodeck"

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
  themeVariants: {
    default: { background: "#222", border: "#444", foreground: "#fff" },
    error: { background: "#f00", border: "#900", foreground: "#fff" },
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
  it("requests editor state and renders the editor", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)

    expect(JSON.parse(ws.sent[0] ?? "{}")).toEqual({
      type: "editor-state-request",
    })
    expect(
      screen.getByRole("heading", { name: "Edition panel" }),
    ).toBeInTheDocument()
    expect(screen.queryByText("YAML sources")).not.toBeInTheDocument()
  })

  it("stages a copied button before adding it", () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy config" }))
    fireEvent.click(screen.getByTestId("deck-key-2"))
    fireEvent.click(screen.getByRole("button", { name: "Paste button" }))

    expect(
      screen.getByRole("button", { name: "Add button" }),
    ).toBeInTheDocument()
    expect(
      ws.sent.some((entry) => JSON.parse(entry).type === "editor-mutate"),
    ).toBe(false)
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
    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.click(screen.getByRole("tab", { name: "Emoji" }))
    fireEvent.change(screen.getByLabelText("Search emoji"), {
      target: { value: "sparkling_heart" },
    })
    expect(
      screen.queryByRole("button", { name: "grinning" }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "sparkling_heart" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
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
    fireEvent.click(screen.getByRole("button", { name: "Save button" }))

    const message = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      mutation?: unknown
    }
    expect(message.mutation).toEqual({
      kind: "update",
      deckId: "main",
      index: 0,
      button: {
        type: "core:action",
        config: { command: "whoami" },
        icon: "💖",
      },
    })
  })

  it("writes an uploaded SVG before persisting the combined button update", async () => {
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
    const validationRequest = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      requestId: string
    }
    view.rerender(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        validation={{
          requestId: validationRequest.requestId,
          valid: true,
          errors: [],
        }}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.click(screen.getByRole("tab", { name: "SVG upload" }))
    fireEvent.change(screen.getByLabelText("Upload SVG"), {
      target: {
        files: [
          new File(
            ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
            "badge.svg",
            { type: "image/svg+xml" },
          ),
        ],
      },
    })
    await waitFor(() =>
      expect(screen.getByAltText("SVG preview")).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    fireEvent.click(screen.getByRole("button", { name: "Save button" }))

    const assetWrite = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      type: string
      requestId: string
      filename: string
    }
    expect(assetWrite.type).toBe("editor-asset-write")
    expect(assetWrite.filename).toMatch(/badge\.svg$/)
    expect(
      ws.sent.some((message) => JSON.parse(message).type === "editor-mutate"),
    ).toBe(false)

    view.rerender(
      <EditorPage
        wsClient={ws}
        state={state}
        result={{ requestId: assetWrite.requestId, ok: true }}
        validation={{
          requestId: validationRequest.requestId,
          valid: true,
          errors: [],
        }}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    await waitFor(() =>
      expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toMatchObject({
        kind: "update",
        button: { icon: `./assets/${assetWrite.filename}` },
      }),
    )
    const writeIndex = ws.sent.findIndex(
      (message) => JSON.parse(message).requestId === assetWrite.requestId,
    )
    const mutationIndex = ws.sent.findIndex(
      (message) => JSON.parse(message).type === "editor-mutate",
    )
    expect(writeIndex).toBeGreaterThanOrEqual(0)
    expect(mutationIndex).toBeGreaterThan(writeIndex)
  })

  it("reveals button types only when creating a button", () => {
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
      screen.queryByRole("button", { name: "test-addon:action" }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    expect(
      screen.getByRole("button", { name: "test-addon:action" }),
    ).toBeInTheDocument()
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
        name: "test-addon:generated",
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

  it("stages a palette button at an empty selected position", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    fireEvent.click(screen.getByRole("button", { name: "test-addon:action" }))

    expect(
      screen.getByRole("button", { name: "Add button" }),
    ).toBeInTheDocument()
    expect(
      ws.sent.some((entry) => JSON.parse(entry).type === "editor-mutate"),
    ).toBe(false)
  })

  it("renders deck fields and dispatches an immutable-id deck update", () => {
    const ws = client()
    render(<EditorPage wsClient={ws} state={state} result={null} />)
    fireEvent.click(screen.getByRole("tab", { name: "Decks" }))
    fireEvent.change(screen.getByLabelText("Deck name"), {
      target: { value: "Updated deck" },
    })
    fireEvent.click(
      screen.getAllByRole("button", { name: "Save deck" }).at(-1)!,
    )

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toMatchObject({
      kind: "update-deck",
      deckId: "main",
      patch: { name: "Updated deck" },
    })
  })

  it("shows the position selector for the selected button", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={state}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit/select" }))
    expect(screen.getByRole("button", { name: "Position 0" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
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

    expect(
      screen.queryByRole("button", { name: "Save button" }),
    ).not.toBeInTheDocument()
  })
})
