/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ReconnectingBanner } from "../components/ReconnectingBanner"

describe("ReconnectingBanner", () => {
  it("renders nothing when status is open", () => {
    const { container } = render(
      <ReconnectingBanner
        status="open"
        disconnectedSince={null}
        attempt={0}
        now={0}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders banner with attempt + seconds elapsed when disconnected under 30s", () => {
    const disconnectedSince = 1000
    const now = 5000
    const { getByTestId } = render(
      <ReconnectingBanner
        status="closed"
        disconnectedSince={disconnectedSince}
        attempt={2}
        now={now}
      />,
    )
    const banner = getByTestId("reconnecting-banner")
    expect(banner).toBeTruthy()
    expect(banner.textContent).toContain("Reconnecting")
    expect(banner.textContent).toContain("attempt 2")
    expect(banner.textContent).toContain("4s elapsed")
  })

  it("renders nothing when elapsed equals 30000ms (boundary belongs to overlay)", () => {
    const disconnectedSince = 0
    const { container } = render(
      <ReconnectingBanner
        status="closed"
        disconnectedSince={disconnectedSince}
        attempt={1}
        now={30000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when elapsed exceeds 30000ms (escalated to overlay)", () => {
    const disconnectedSince = 0
    const { container } = render(
      <ReconnectingBanner
        status="closed"
        disconnectedSince={disconnectedSince}
        attempt={1}
        now={60000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when disconnectedSince is null even if status is closed", () => {
    const { container } = render(
      <ReconnectingBanner
        status="closed"
        disconnectedSince={null}
        attempt={3}
        now={1000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
