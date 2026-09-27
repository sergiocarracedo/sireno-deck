/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ButtonConfigEditor } from "../pages/ButtonConfigEditor"

const wsClient = () => ({
  send: vi.fn(),
  close: vi.fn(),
  status: () => "open" as const,
  attemptCount: () => 0,
  lastError: () => null,
})

describe("ButtonConfigEditor", () => {
  it("adds and removes array config items", () => {
    const onSave = vi.fn()
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ tags: ["one"] }}
        schema={{
          type: "object",
          properties: { tags: { type: "array", items: { type: "string" } } },
        }}
        validation={null}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }))
    expect(screen.getByDisplayValue("one")).toBeInTheDocument()
    expect(screen.getAllByDisplayValue("")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Delete item 1" }))
    expect(screen.queryByDisplayValue("one")).not.toBeInTheDocument()
  })

  it("shows YAML errors and disables save", () => {
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ command: "date" }}
        schema={{
          type: "object",
          properties: { command: { type: "string" } },
        }}
        validation={{ requestId: "missing", valid: true, errors: [] }}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("tab", { name: "YAML" }))
    fireEvent.change(screen.getByLabelText("Button config YAML"), {
      target: { value: "command: [" },
    })

    expect(screen.getByRole("alert")).toHaveTextContent("must be")
    expect(
      screen.getByRole("button", { name: "Save button config" }),
    ).toBeDisabled()
  })

  it("applies a chosen Lucide icon only after Apply", () => {
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ icon: "" }}
        schema={{
          type: "object",
          properties: {
            icon: { type: "string", title: "Icon", "x-control": "icon" },
          },
        }}
        validation={null}
        onSave={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.change(screen.getByLabelText("Search Lucide icons"), {
      target: { value: "activity" },
    })
    fireEvent.click(screen.getByRole("button", { name: "activity" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /activity/ })).toBeInTheDocument()
  })

  it("discards an icon selection when the picker is canceled", () => {
    const onDraftChange = vi.fn()
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ icon: "" }}
        schema={{
          type: "object",
          properties: { icon: { type: "string", "x-control": "icon" } },
        }}
        validation={null}
        onSave={vi.fn()}
        onDraftChange={onDraftChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.change(screen.getByLabelText("Search Lucide icons"), {
      target: { value: "activity" },
    })
    fireEvent.click(screen.getByRole("button", { name: "activity" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onDraftChange).not.toHaveBeenCalledWith({ icon: "icon://activity" })
  })

  it("renders boolean config fields as labeled switches", () => {
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ enabled: true }}
        schema={{
          type: "object",
          properties: { enabled: { type: "boolean", title: "Enabled" } },
        }}
        validation={null}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByRole("switch", { name: "Enabled" })).toBeChecked()
  })

  it("keeps an uploaded SVG pending until Apply", async () => {
    const onPendingAssetChange = vi.fn()
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ icon: "" }}
        schema={{
          type: "object",
          properties: { icon: { type: "string", "x-control": "icon" } },
        }}
        validation={null}
        onSave={vi.fn()}
        onPendingAssetChange={onPendingAssetChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.click(screen.getByRole("tab", { name: "SVG upload" }))
    fireEvent.change(screen.getByLabelText("Upload SVG"), {
      target: {
        files: [
          new File(
            ['<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
            "test.svg",
            { type: "image/svg+xml" },
          ),
        ],
      },
    })
    await waitFor(() =>
      expect(screen.getByAltText("SVG preview")).toBeInTheDocument(),
    )
    expect(onPendingAssetChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onPendingAssetChange).toHaveBeenCalledWith(
      "icon",
      expect.objectContaining({
        filename: expect.stringMatching(/test\.svg$/),
      }),
    )
  })
})
