import { createElement } from "react"
import { afterEach, describe, expect, it } from "vitest"

import {
  handleSettingsButtonTap,
  nextBrightnessDown,
  nextBrightnessUp,
  renderSettingsButton,
} from "@/deck/settings-deck"
import {
  _resetDeviceRegistryForTests,
  getCurrentBrightness,
  setBrightnessAll,
} from "@/device/registry"
import { renderReactNodeToHtml } from "@/render/dom-host"

afterEach(() => {
  _resetDeviceRegistryForTests()
})

function render(id: string): string {
  return renderReactNodeToHtml(renderSettingsButton(id))
}

describe("nextBrightnessUp", () => {
  it("returns the value plus 10", () => {
    expect(nextBrightnessUp(50)).toBe(60)
  })

  it("clamps to 100", () => {
    expect(nextBrightnessUp(95)).toBe(100)
    expect(nextBrightnessUp(100)).toBe(100)
  })
})

describe("nextBrightnessDown", () => {
  it("returns the value minus 10", () => {
    expect(nextBrightnessDown(50)).toBe(40)
  })

  it("clamps to 10 (the minimum allowed level)", () => {
    expect(nextBrightnessDown(15)).toBe(10)
    expect(nextBrightnessDown(10)).toBe(10)
    expect(nextBrightnessDown(5)).toBe(10)
    expect(nextBrightnessDown(0)).toBe(10)
  })
})

describe("renderSettingsButton", () => {
  it("renders brightness-up with a 'Brighter' label", () => {
    const html = render("brightness-up")
    expect(html).toContain("Brighter")
    expect(html).toContain('sireno-settings-button="brightness-up"')
  })

  it("renders brightness-down with a 'Dimmer' label", () => {
    const html = render("brightness-down")
    expect(html).toContain("Dimmer")
    expect(html).toContain('sireno-settings-button="brightness-down"')
  })

  it("renders current-brightness with the current percentage", () => {
    const html = render("current-brightness")
    expect(html).toContain("50%")
    expect(html).toContain('sireno-settings-button="current-brightness"')
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

describe("handleSettingsButtonTap", () => {
  it("brightness-up calls setBrightnessAll(current + 10)", async () => {
    await setBrightnessAll(50)
    await handleSettingsButtonTap("brightness-up")
    expect(getCurrentBrightness()).toBe(60)
  })

  it("brightness-down calls setBrightnessAll(current - 10)", async () => {
    await setBrightnessAll(50)
    await handleSettingsButtonTap("brightness-down")
    expect(getCurrentBrightness()).toBe(40)
  })

  it("clamps brightness-up at 100", async () => {
    await setBrightnessAll(95)
    await handleSettingsButtonTap("brightness-up")
    expect(getCurrentBrightness()).toBe(100)
  })

  it("clamps brightness-down at 10 (the minimum allowed level)", async () => {
    await setBrightnessAll(5)
    await handleSettingsButtonTap("brightness-down")
    expect(getCurrentBrightness()).toBe(10)
  })

  it("is a no-op for non-brightness button ids", async () => {
    await setBrightnessAll(50)
    await handleSettingsButtonTap("current-brightness")
    await handleSettingsButtonTap("logo-version")
    await handleSettingsButtonTap("does-not-exist")
    expect(getCurrentBrightness()).toBe(50)
  })
})
