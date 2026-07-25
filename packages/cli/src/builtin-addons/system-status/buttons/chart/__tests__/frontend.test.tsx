/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import type { ComponentType } from "react"

import type { AddonFrontendButtonProps } from "@/addon/api"
import { ChannelRegistry } from "@/api/react/registry"

import { CHART_HISTORY_CHANNEL } from "../../../domain"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = AddonFrontendButtonProps<any>

// Mock the hooks used by the frontend
vi.mock("../../../buttons/_shared", () => ({
  useAllMetricChannels: () => ({
    cpu: { available: true, value: 73 },
    ram: { available: true, value: 60 },
  }),
  readSnapshot: (payload: unknown, id: string) => ({
    available: (payload as { available: boolean })?.available ?? false,
    id,
    label: id === "cpu" ? "CPU" : "RAM",
    value: (payload as { value?: number })?.value,
  }),
  resolveMetricId: (entry: unknown) => {
    if (typeof entry === "string") return entry as string
    if (entry && typeof entry === "object" && "id" in entry)
      return (entry as { id: string }).id
    return null
  },
  pickLabel: (entry: unknown, fallback: string) => {
    if (entry && typeof entry === "object" && "label" in entry)
      return (entry as { label: string }).label
    return fallback
  },
}))

vi.mock("@/api/react", () => ({
  useAddonChannel: (channel: string) => {
    return {
      data: ChannelRegistry.instance().last(channel),
    }
  },
}))

import ChartFrontendBase from "../frontend"
const ChartFrontend = ChartFrontendBase as ComponentType<AnyProps>

function buildConfig(overrides: Record<string, unknown> = {}) {
  return {
    metrics: [{ id: "cpu" }, { id: "ram" }],
    windowSeconds: 60,
    pollInterval: 1000,
    ...overrides,
  }
}

describe("ChartFrontend", () => {
  beforeEach(() => {
    ChannelRegistry.resetForTests()
  })

  it("renders ValueChart with two series when config has cpu and ram", () => {
    const reg = ChannelRegistry.instance()
    reg.publish(CHART_HISTORY_CHANNEL, {
      samples: {
        cpu: [
          { at: Date.now() - 3000, value: 50 },
          { at: Date.now() - 2000, value: 60 },
          { at: Date.now() - 1000, value: 70 },
        ],
        ram: [
          { at: Date.now() - 3000, value: 40 },
          { at: Date.now() - 2000, value: 50 },
          { at: Date.now() - 1000, value: 55 },
        ],
      },
    })

    const { container } = render(
      <ChartFrontend
        config={buildConfig()}
        state={null}
        addonName="system-status"
        buttonType="system-status:chart"
        buttonId="test-chart"
        gesture={null}
      />,
    )

    expect(
      container.querySelector('[data-sireno-ui-valuechart="true"]'),
    ).not.toBeNull()
    const svg = container.querySelector('svg[preserveAspectRatio="none"]')
    expect(svg).not.toBeNull()
    const paths = svg!.querySelectorAll("path")
    // one path per series
    expect(paths.length).toBe(2)
  })

  it("renders empty div when no metrics match chart view", () => {
    const reg = ChannelRegistry.instance()
    reg.publish(CHART_HISTORY_CHANNEL, { samples: {} })

    const { container } = render(
      <ChartFrontend
        config={buildConfig({ metrics: [] })}
        state={null}
        addonName="system-status"
        buttonType="system-status:chart"
        buttonId="test-chart"
        gesture={null}
      />,
    )

    expect(
      container.querySelector('[data-sireno-ui-valuechart="true"]'),
    ).toBeNull()
  })
})
