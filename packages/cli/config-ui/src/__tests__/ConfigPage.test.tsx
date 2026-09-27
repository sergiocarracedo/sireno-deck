/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { ConfigPage } from "../pages/ConfigPage"

const wsClient = () => ({ send: vi.fn() })

describe("ConfigPage", () => {
  it("renders source files and validates drafts before saving", () => {
    const ws = wsClient()
    render(
      <ConfigPage
        wsClient={ws}
        editorState={{
          revision: 3,
          config: {},
          sources: ["/config.yml", "/buttons.yml"],
          sourceContents: { "/config.yml": "decks: {}", "/buttons.yml": "[]" },
          themes: [],
          canUndo: false,
        }}
      />,
    )
    expect(screen.getAllByText("/config.yml")).not.toHaveLength(0)
    expect(screen.getByText("/buttons.yml")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Configuration source YAML"), {
      target: { value: "decks: {}\n" },
    })
    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("editor-source-validation-request"),
    )
  })

  it("places theme selection beside the view tabs", () => {
    const ws = wsClient()
    render(
      <ConfigPage
        editor={<div>Visual editor</div>}
        wsClient={ws}
        editorState={{
          revision: 3,
          config: { theme: "default" },
          sources: [],
          themes: [{ name: "default" }, { name: "midnight" }],
          canUndo: false,
        }}
      />,
    )

    fireEvent.click(screen.getByLabelText("Theme"))
    fireEvent.click(screen.getByRole("option", { name: "midnight" }))

    expect(JSON.parse(ws.send.mock.calls[0][0])).toMatchObject({
      type: "editor-mutate",
      revision: 3,
      mutation: { kind: "set-theme", theme: "midnight" },
    })
  })
})
