/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import SummaryFrontend from "../frontend"
import type { SummaryConfig } from "../config"

declare global {
  var __codingAgentsUseAddonChannel:
    | (<T>(channel: string) => { data: T | undefined })
    | undefined
}

const holder: { data: unknown } = { data: undefined }

beforeEach(() => {
  globalThis.__codingAgentsUseAddonChannel = <T,>(
    _channel: string,
  ): { data: T | undefined } => ({ data: holder.data as T | undefined })
})

const renderSummary = (config: Partial<SummaryConfig>) =>
  render(
    <SummaryFrontend
      config={config as SummaryConfig}
      state={null}
      addonName="coding-agents"
      buttonType="coding-agents:summary"
      buttonId="0"
      gesture={null}
    />,
  )

describe("coding-agents:summary matrix rain", () => {
  it("renders the rain layer by default", () => {
    const { container } = renderSummary({})
    expect(container.querySelector(".sirenoCaRain")).not.toBeNull()
    expect(
      container.querySelectorAll(".sirenoCaRainSt").length,
    ).toBeGreaterThan(0)
  })

  it("omits the rain layer when fallingLetters is false", () => {
    const { container } = renderSummary({ fallingLetters: false })
    expect(container.querySelector(".sirenoCaRain")).toBeNull()
  })

  it("keeps rain characters stable across data re-renders", () => {
    const { container, rerender } = renderSummary({})
    const before = Array.from(
      container.querySelectorAll(".sirenoCaRainSt"),
    ).map((el) => el.textContent)

    holder.data = { byProvider: { opencode: [{ status: "running" }] } }
    rerender(
      <SummaryFrontend
        config={{ fallingLetters: true } as SummaryConfig}
        state={null}
        addonName="coding-agents"
        buttonType="coding-agents:summary"
        buttonId="0"
        gesture={null}
      />,
    )

    const after = Array.from(container.querySelectorAll(".sirenoCaRainSt")).map(
      (el) => el.textContent,
    )
    expect(after).toEqual(before)
  })

  it("shows idle agents in the status summary", () => {
    holder.data = {
      byProvider: {
        opencode: [{ status: "idle" }, { status: "idle" }, { status: "idle" }],
      },
    }

    const { container } = renderSummary({})

    expect(container.textContent).toContain("3 idle")
  })

  it("uses a contrasting text color during the highlight", () => {
    const { container, rerender } = renderSummary({})
    holder.data = {
      byProvider: { opencode: [{ sessionId: "one", status: "running" }] },
    }
    rerender(
      <SummaryFrontend
        config={{} as SummaryConfig}
        state={null}
        addonName="coding-agents"
        buttonType="coding-agents:summary"
        buttonId="0"
        gesture={null}
      />,
    )

    expect(container.querySelector("style")?.textContent).toContain(
      "color:var(--sireno-color-background)",
    )
  })
})
