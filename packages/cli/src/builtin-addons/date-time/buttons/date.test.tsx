import { describe, expect, it } from "vitest"

import { renderReactNodeToHtml } from "@/render/dom-host"
import { builtinDateButton } from "./calendar-sheet"

function renderDate(config: Record<string, unknown> = {}) {
  return renderReactNodeToHtml(
    builtinDateButton.render!({
      button: { position: 0, type: "date" },
      config,
      frameState: "idle",
      hostContext: undefined as never,
      methods: {} as never,
      payload: undefined,
      pressed: false,
      store: { addon: { snapshot: undefined }, button: { snapshot: undefined } } as never,
      theme: undefined,
    } as never),
  )
}

describe("builtinDateButton render", () => {
  it("renders a month abbreviation in accent tone", () => {
    const html = renderDate()
    expect(html).toContain("text-accent")
    expect(html).toMatch(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/)
  })

  it("renders a day number in primary tone", () => {
    const html = renderDate()
    expect(html).toContain("text-primary")
    expect(html).toMatch(/>[0-9]{1,2}</)
  })

  it("renders a weekday name in foreground tone", () => {
    const html = renderDate()
    expect(html).toContain("text-foreground")
    expect(html).toMatch(/MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY/)
  })

  it("renders the surface in full mode (no chrome frame)", () => {
    const html = renderDate()
    expect(html).toContain('data-sireno-full-surface="true"')
  })

  it("uses default locale and time zone when none configured", () => {
    const html = renderDate()
    // The default locale is en-US, so the month should be a 3-letter abbreviation
    // and weekday should be a full English day name.
    expect(html).toMatch(/[A-Z]{3}/)
  })
})
