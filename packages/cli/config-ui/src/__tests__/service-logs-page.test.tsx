/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { appendServiceLog, clearServiceLogs } from "../bridge-log-store"
import { ServiceLogsPage } from "../pages/ServiceLogsPage"

describe("ServiceLogsPage", () => {
  beforeEach(() => {
    clearServiceLogs()
  })

  it("renders a [component] bracket when present", () => {
    appendServiceLog({
      ts: 1,
      level: "info",
      msg: "invokeAction resolved",
      component: "runtime",
      deckId: "main",
      position: 4,
    })
    render(<ServiceLogsPage />)
    expect(screen.getByTestId("service-logs-page").textContent).toContain(
      "[runtime]",
    )
    expect(screen.getByTestId("service-logs-page").textContent).toContain(
      "invokeAction resolved",
    )
  })

  it("renders context fields when present", () => {
    appendServiceLog({
      ts: 1,
      level: "info",
      msg: "invokeAction resolved",
      component: "runtime",
      deckId: "main",
      position: 4,
      gesture: "tap",
      addonName: "system-status",
    })
    render(<ServiceLogsPage />)
    const text = screen.getByTestId("service-logs-page").textContent
    expect(text).toContain("deckId=main")
    expect(text).toContain("position=4")
    expect(text).toContain("gesture=tap")
    expect(text).toContain("addon=system-status")
  })

  it("omits the bracket when component is absent", () => {
    appendServiceLog({ ts: 1, level: "info", msg: "plain" })
    render(<ServiceLogsPage />)
    const text = screen.getByTestId("service-logs-page").textContent
    expect(text).not.toMatch(/\[(runtime|methods|executor|emulator|real)\]/)
    expect(text).toContain("plain")
  })
})
