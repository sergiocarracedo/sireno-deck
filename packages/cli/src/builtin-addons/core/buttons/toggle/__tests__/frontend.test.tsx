/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ChannelRegistry } from "@/api/react/registry"

import ToggleButtonFrontend from "../frontend"
import {
  TOGGLE_STATES_CHANNEL,
  type ToggleStatesPayload,
} from "../global-service"
import type { StatusToggleConfig } from "../config"

beforeEach(() => ChannelRegistry.resetForTests())
afterEach(() => ChannelRegistry.resetForTests())

const renderToggle = (
  config: StatusToggleConfig | { key: string },
  buttonId = "0",
) => {
  return render(
    <ToggleButtonFrontend
      // @ts-expect-error partial config acceptable in tests
      config={config}
      state={null}
      addonName="core"
      buttonType="core:toggle"
      buttonId={buttonId}
      gesture={null}
    />,
  )
}

const PLAYING_CONFIG: StatusToggleConfig = {
  statusCommand: "playerctl status",
  states: {
    Playing: { label: "Playing", icon: "icon://play" },
    Paused: { label: "Paused", icon: "icon://pause" },
  },
}

const publishStates = (byButton: ToggleStatesPayload["byButton"]): void => {
  act(() => {
    ChannelRegistry.instance().publish<ToggleStatesPayload>(
      TOGGLE_STATES_CHANNEL,
      { byButton },
    )
  })
}

describe("core:toggle frontend", () => {
  it("renders muted fallback before any data is published", () => {
    const { container } = renderToggle(PLAYING_CONFIG)
    expect(container.textContent).toContain("…")
  })

  it("renders the matched state's label and icon", () => {
    publishStates({
      "0": { raw: "Playing", state: "Playing", at: 1 },
    })
    const { container } = renderToggle(PLAYING_CONFIG, "0")
    expect(container.textContent).toContain("Playing")
  })

  it("renders muted raw text when the polled state is undeclared", () => {
    publishStates({
      "0": { raw: "Stopped", state: undefined, at: 1 },
    })
    const { container } = renderToggle(PLAYING_CONFIG, "0")
    expect(container.textContent).toContain("Stopped")
  })

  it("renders 'err' when the status command failed", () => {
    publishStates({
      "0": {
        raw: "",
        state: undefined,
        error: "playerctl not found",
        at: 1,
      },
    })
    const { container } = renderToggle(PLAYING_CONFIG, "0")
    expect(container.textContent).toContain("err")
  })

  it("renders nothing useful for the legacy { key } config", () => {
    const { container } = renderToggle({ key: "k" }, "0")
    expect(container.textContent).toContain("—")
  })

  it("ignores states that belong to other buttons", () => {
    publishStates({
      "1": { raw: "Playing", state: "Playing", at: 1 },
    })
    const { container } = renderToggle(PLAYING_CONFIG, "0")
    expect(container.textContent).toContain("…")
  })
})
