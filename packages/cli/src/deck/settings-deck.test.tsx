import { createElement } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { renderSettingsButton } from "@/deck/settings-deck"
import { _resetDeviceRegistryForTests } from "@/device/registry"
import { renderReactNodeToHtml } from "@/render/dom-host"

afterEach(() => {
  _resetDeviceRegistryForTests()
})

function render(id: string): string {
  return renderReactNodeToHtml(renderSettingsButton(id))
}

describe("renderSettingsButton", () => {
  it("renders brightness-up with a 'Brighter' label", () => {
    const html = render("brightness-up")
    expect(html).toContain("Brighter")
    expect(html).toContain("sireno-settings-button=\"brightness-up\"")
  })

  it("renders brightness-down with a 'Dimmer' label", () => {
    const html = render("brightness-down")
    expect(html).toContain("Dimmer")
    expect(html).toContain("sireno-settings-button=\"brightness-down\"")
  })

  it("renders current-brightness with the current percentage", () => {
    const html = render("current-brightness")
    expect(html).toContain("50%")
    expect(html).toContain("sireno-settings-button=\"current-brightness\"")
  })

  it("renders the logo+version for the logo-version id", () => {
    const html = render("logo-version")
    expect(html).toContain("sireno-logo-version")
  })

  it("renders an empty placeholder for unknown ids", () => {
    const html = render("does-not-exist")
    expect(html).toContain("sireno-settings-button=\"empty\"")
  })
})
