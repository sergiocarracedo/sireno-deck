/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
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
})
