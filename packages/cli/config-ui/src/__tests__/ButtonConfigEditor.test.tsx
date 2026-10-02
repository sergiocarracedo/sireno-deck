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
  it("shows addon schema descriptions as field help", () => {
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="date-time:date-time"
        config={{ format: "YYYY-MM-DD" }}
        schema={{
          type: "object",
          properties: {
            format: {
              type: "string",
              title: "Date and time format",
              description: "Use YYYY for the full year.",
            },
          },
        }}
        validation={null}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText("Use YYYY for the full year.")).toBeInTheDocument()
    expect(screen.getByLabelText("Date and time format")).toHaveValue(
      "YYYY-MM-DD",
    )
  })

  it("notifies the preview with locally edited config before validation", async () => {
    const onPreviewChange = vi.fn()
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ name: "before" }}
        schema={{
          type: "object",
          properties: { name: { type: "string" } },
        }}
        validation={null}
        onSave={vi.fn()}
        onPreviewChange={onPreviewChange}
      />,
    )

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "after" },
    })

    await waitFor(() =>
      expect(onPreviewChange).toHaveBeenLastCalledWith({ name: "after" }),
    )
  })

  it("renders keyboard macros with HeroUI keyboard keys", () => {
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ command: "macro://ctrl+c;delay(50ms);ctrl+v" }}
        schema={{
          type: "object",
          properties: {
            command: { type: "string", "x-control": "action" },
          },
        }}
        validation={null}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByText("ctrl+c")).toBeInTheDocument()
    expect(screen.getByText("delay(50ms)")).toBeInTheDocument()
    expect(screen.getByText("ctrl+v")).toBeInTheDocument()
    expect(screen.getByLabelText("Default macro").tagName).toBe("INPUT")
    expect(screen.getByLabelText("macOS override").tagName).toBe("INPUT")
    expect(screen.getByLabelText("Linux override").tagName).toBe("INPUT")
    expect(screen.getByLabelText("Windows override").tagName).toBe("INPUT")
  })

  it("toggles boolean config fields through the HeroUI switch", async () => {
    const onPreviewChange = vi.fn()
    render(
      <ButtonConfigEditor
        wsClient={wsClient()}
        revision={1}
        buttonType="test:button"
        config={{ show_count: false }}
        schema={{
          type: "object",
          properties: {
            show_count: { type: "boolean", title: "Show count" },
          },
        }}
        validation={null}
        onSave={vi.fn()}
        onPreviewChange={onPreviewChange}
      />,
    )

    const toggle = screen.getByRole("switch", { name: "Show count" })
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
    await waitFor(() =>
      expect(onPreviewChange).toHaveBeenLastCalledWith({ show_count: true }),
    )
  })

  it("applies an emoji selected in the icon picker", async () => {
    const onPreviewChange = vi.fn()
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
        onPreviewChange={onPreviewChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Choose icon" }))
    fireEvent.click(screen.getByRole("tab", { name: "Emoji" }))
    fireEvent.click(screen.getByRole("button", { name: "sparkling_heart" }))
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    await waitFor(() =>
      expect(onPreviewChange).toHaveBeenLastCalledWith({ icon: "💖" }),
    )
  })

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
