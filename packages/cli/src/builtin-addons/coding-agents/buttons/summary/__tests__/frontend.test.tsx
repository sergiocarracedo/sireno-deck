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
})
