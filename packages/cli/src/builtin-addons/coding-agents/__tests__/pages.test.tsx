/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  AgentContextPage,
  AgentDetailsPage,
  AgentMetricsPage,
  formatTokens,
} from "../buttons/agent/pages"

// ponytail: jsdom lacks ResizeObserver; the Text primitive's autofit
// observes on mount.
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock)

describe("formatTokens", () => {
  it("uses compact multipliers with european long-scale billions", () => {
    expect(formatTokens(100)).toBe("100")
    expect(formatTokens(1_000)).toBe("1k")
    expect(formatTokens(100_000)).toBe("100k")
    expect(formatTokens(1_500_000)).toBe("1.5M")
    expect(formatTokens(10_000_000)).toBe("10M")
    expect(formatTokens(8_000_000_000)).toBe("8kM")
    expect(formatTokens(2_000_000_000_000)).toBe("2MM")
    expect(formatTokens(undefined)).toBe("---")
  })
})

describe("coding-agents agent details page", () => {
  it("keeps the metrics page to two labelled rows", () => {
    const { container } = render(
      <AgentMetricsPage
        title="Refactor"
        status="running"
        cost={1}
        contextTokens={100}
        contextPercent={10}
        tileColor="transparent"
        dotColor="#fff"
      />,
    )

    expect(container.textContent).toContain("cost")
    expect(container.textContent).toContain("tokens")
    expect(container.textContent).not.toContain("context")
  })

  it("shows useful session details with labels", () => {
    const { container } = render(
      <AgentDetailsPage
        title="Refactor"
        status="running"
        sessionId="session-12345678"
        directory="/work/project"
        lastMessagePreview="Editing the provider"
        tileColor="transparent"
        dotColor="#fff"
      />,
    )

    expect(container.textContent).toContain("session")
    expect(container.textContent).toContain("activity")
    expect(container.textContent).toContain("12345678")
  })

  it("puts context and project on a separate labelled page", () => {
    const { container } = render(
      <AgentContextPage
        title="Refactor"
        status="running"
        contextPercent={10}
        directory="/work/project"
        tileColor="transparent"
        dotColor="#fff"
      />,
    )

    expect(container.textContent).toContain("context")
    expect(container.textContent).toContain("project")
  })
})
