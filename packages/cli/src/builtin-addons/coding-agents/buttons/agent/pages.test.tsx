/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AgentContextPage, AgentDetailsPage, AgentMetricsPage } from "./pages"

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

    expect(container.textContent).toContain("project")
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
