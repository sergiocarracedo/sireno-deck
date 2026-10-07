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
      properties: {
        command: { type: "string", title: "Config command" },
        icon: { type: "string", title: "Icon", "x-control": "icon" },
        label: { type: "string", title: "Label" },
      },
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("Config command", { exact: true }), {
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
        config: { command: "whoami", icon: "💖" },
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
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
    const iconValidation = JSON.parse(ws.sent.at(-1) ?? "{}") as {
      requestId: string
    }
    view.rerender(
      <EditorPage
        wsClient={ws}
        state={state}
        result={null}
        validation={{
          requestId: iconValidation.requestId,
          valid: true,
          errors: [],
        }}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
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
        button: { config: { icon: `./assets/${assetWrite.filename}` } },
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

  it("searches all user-configurable button types, including built-in addons", async () => {
    render(
      <EditorPage
        wsClient={client()}
        state={state}
        result={null}
        addonInventory={{
          addons: [
            {
              ...inventory.addons[0]!,
              name: "core",
              internal: true,
              buttonTypes: [{ type: "core:action", internal: false }],
            },
            ...inventory.addons,
          ],
        }}
      />,
    )

    expect(screen.getByRole("tab", { name: "Buttons" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(
      screen.queryByRole("button", { name: /test-addon:action/ }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    expect(
      screen.queryByText("Select a button using its ⋮ menu."),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Config command")).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole("textbox", { name: /Button type/ }), {
      target: { value: "core:action" },
    })
    expect(
      screen.getByRole("button", { name: /core:action/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "core" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /core:action/ }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add button" }),
      ).toBeInTheDocument(),
    )
    expect(
      screen.queryByRole("button", { name: "New button" }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    fireEvent.change(screen.getByRole("textbox", { name: /Button type/ }), {
      target: { value: "test-addon:action" },
    })
    expect(
      screen.getByRole("button", { name: /test-addon:action/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /core:action/ }),
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.pointerDown(screen.getByTestId("deck-key-1"))
    fireEvent.pointerUp(screen.getByTestId("deck-key-1"))

    expect(
      screen.getByLabelText("Config command", { exact: true }),
    ).toHaveValue("date")
    expect(ws.sent.some((message) => message.includes("editor-mutate"))).toBe(
      false,
    )
  })

  it("stages a palette button at the first available non-system position", async () => {
    const ws = client()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(
      <EditorPage
        wsClient={ws}
        state={{
          ...state,
          surfaces: [
            {
              id: "main",
              buttons: [{ type: "core:settings-entry", position: 14 }],
            },
          ],
        }}
        result={null}
        addonInventory={inventory}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    fireEvent.change(screen.getByRole("textbox", { name: /Button type/ }), {
      target: { value: "test-addon:action" },
    })
    fireEvent.click(screen.getByRole("button", { name: /test-addon:action/ }))

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "First available" }),
      ).toBeInTheDocument(),
    )
    const firstAvailable = screen.getByRole("button", {
      name: "First available",
    })
    const positionZero = screen.getByRole("button", { name: "Position 0" })
    expect(firstAvailable.parentElement).not.toBe(positionZero.parentElement)
    expect(
      screen.getByRole("button", { name: "Add button" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Position 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(
      screen
        .getAllByRole("button", { name: /^Position/ })
        .filter((button) => button.getAttribute("aria-pressed") === "true"),
    ).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Position 4" }))
    expect(screen.getByRole("button", { name: "Position 4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(
      ws.sent.some((entry) => JSON.parse(entry).type === "editor-mutate"),
    ).toBe(false)
  })

  it("confirms an occupied add position before staging an override", async () => {
    const ws = client()
    const props = {
      wsClient: ws,
      state: {
        ...state,
        buttonSchemas: {
          ...state.buttonSchemas,
          "test-addon:action": { type: "object", properties: {} },
        },
      },
      result: null,
      addonInventory: inventory,
      frontendUrl: "http://127.0.0.1:5180",
      device: DEVICE_MODELS.find((model) => model.id === "mk2"),
    }
    const view = render(<EditorPage {...props} />)
    fireEvent.click(screen.getByRole("button", { name: "New button" }))
    fireEvent.change(screen.getByRole("textbox", { name: /Button type/ }), {
      target: { value: "test-addon:action" },
    })
    fireEvent.click(screen.getByRole("button", { name: /test-addon:action/ }))

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Position 0" }),
      ).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole("button", { name: "Position 0" }))
    expect(
      screen.getByRole("heading", { name: "Replace key 1?" }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("button", { name: "Position 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    fireEvent.click(screen.getByRole("button", { name: "Position 0" }))
    fireEvent.click(screen.getByRole("button", { name: "Replace key" }))
    expect(screen.getByRole("button", { name: "Position 0" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const validation = JSON.parse(
      ws.sent
        .filter(
          (entry) => JSON.parse(entry).type === "editor-validation-request",
        )
        .at(-1) ?? "{}",
    ) as { requestId: string }
    view.rerender(
      <EditorPage
        {...props}
        validation={{
          requestId: validation.requestId,
          valid: true,
          errors: [],
        }}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Add button" }))

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toMatchObject({
      kind: "add-button",
      replaceIndex: 0,
      button: { position: 0 },
    })
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(screen.getByRole("button", { name: "Position 0" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(
      screen.getByRole("button", { name: "Change type: core:action" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Position 0" })).toHaveClass(
      "aria-pressed:bg-white",
    )
    expect(screen.getByRole("button", { name: "Position 1" })).toHaveClass(
      "bg-surface-secondary",
    )
  })

  it("swaps an occupied position and keeps editing the same button", () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.click(screen.getByRole("button", { name: "Position 1" }))

    expect(JSON.parse(ws.sent.at(-1) ?? "{}").mutation).toEqual({
      kind: "move-position",
      deckId: "main",
      from: 0,
      to: 1,
    })
    expect(screen.getByLabelText("Config command")).toHaveValue("date")
    expect(screen.getByRole("button", { name: "Position 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("stages an edited button in the first available position", () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.click(screen.getByRole("button", { name: "First available" }))

    expect(screen.getByRole("button", { name: "Position 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByLabelText("Config command")).toHaveValue("date")
  })

  it("changes an existing button type using its defaults and owned gestures", async () => {
    render(
      <EditorPage
        wsClient={client()}
        state={{
          ...state,
          config: {
            decks: {
              main: {
                buttons: [
                  {
                    type: "core:action",
                    position: 0,
                    icon: "icon://play",
                    label: "Keep this label",
                    config: { command: "old" },
                    actions: {
                      tap: "macro://ctrl+a",
                      hold: "macro://ctrl+h",
                    },
                  },
                ],
              },
            },
          },
          buttonSchemas: {
            ...state.buttonSchemas,
            "test-addon:owned": {
              type: "object",
              properties: {
                message: { type: "string", title: "Message" },
              },
            },
          },
        }}
        result={null}
        addonInventory={{
          addons: [
            {
              ...inventory.addons[0]!,
              buttonTypes: [
                { type: "core:action", internal: false },
                {
                  type: "test-addon:owned",
                  internal: false,
                  defaultConfig: { message: "new default" },
                  gestureHandlers: ["hold"],
                },
              ],
            },
          ],
        }}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.click(
      screen.getByRole("button", { name: "Change type: core:action" }),
    )
    expect(screen.queryByLabelText("Config command")).not.toBeInTheDocument()
    expect(
      screen.queryByText("Select a button using its ⋮ menu."),
    ).not.toBeInTheDocument()
    const typePicker = screen.getByRole("textbox", {
      name: /Change button type/,
    })
    fireEvent.change(typePicker, { target: { value: "test-addon:owned" } })
    fireEvent.click(screen.getByRole("button", { name: /test-addon:owned/ }))

    await waitFor(() =>
      expect(screen.getByLabelText("Message")).toHaveValue("new default"),
    )
    expect(screen.getByLabelText("Message")).toHaveValue("new default")
    expect(screen.queryByLabelText("Button label")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Position 0" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    fireEvent.click(screen.getByRole("button", { name: "Gesture actions" }))
    expect(screen.getByRole("tab", { name: "Tap" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Double tap" })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: "Hold" })).not.toBeInTheDocument()
  })

  it("clears a selected button when switching decks with the same position", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={{
          ...state,
          config: {
            decks: {
              main: {
                name: "Main deck",
                buttons: [{ type: "core:action", config: { command: "main" } }],
              },
              other: {
                name: "Other deck",
                buttons: [
                  { type: "core:action", config: { command: "other" } },
                ],
              },
            },
          },
        }}
        result={null}
        runtimeDeckId="main"
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(screen.getByLabelText("Config command")).toHaveValue("main")

    fireEvent.click(screen.getByRole("tab", { name: "Decks" }))
    fireEvent.click(screen.getByRole("button", { name: /Other deck/ }))
    fireEvent.click(screen.getByRole("tab", { name: "Buttons" }))

    expect(screen.queryByLabelText("Config command")).not.toBeInTheDocument()
    expect(
      screen.getByText("Select a button using its ⋮ menu."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Actions for key 0" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(screen.getByLabelText("Config command")).toHaveValue("other")
  })

  it("does not render a tree-actions menu for a system key", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={{
          ...state,
          surfaces: [
            {
              id: "main",
              buttons: [{ type: "core:settings-entry", position: 14 }],
            },
          ],
        }}
        result={null}
        frontendUrl="http://127.0.0.1:5180"
        device={DEVICE_MODELS.find((model) => model.id === "mk2")}
      />,
    )
    expect(
      screen.queryByRole("button", { name: "Actions for key 14" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Actions for key 13" }),
    ).toBeInTheDocument()
  })

  it("keeps icon and label controls in the addon-specific form", () => {
    render(
      <EditorPage
        wsClient={client()}
        state={{
          ...state,
          config: {
            decks: {
              main: {
                buttons: [
                  { type: "date-time:time", config: { variant: "default" } },
                ],
              },
            },
          },
          buttonSchemas: {
            "date-time:time": {
              type: "object",
              properties: {
                variant: { type: "string", enum: ["default", "big"] },
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    expect(
      screen.queryByRole("button", { name: "Choose icon" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Button label")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Theme variant")).toBeInTheDocument()
  })

  it("exposes tap, double-tap, and hold action editors", () => {
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))
    fireEvent.click(screen.getByRole("button", { name: "Gesture actions" }))
    expect(screen.getByRole("tab", { name: "Tap" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Double tap" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Hold" })).toBeInTheDocument()
    expect(screen.getByLabelText("Tap command")).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }))

    expect(
      screen.queryByRole("button", { name: "Save button" }),
    ).not.toBeInTheDocument()
  })
})
