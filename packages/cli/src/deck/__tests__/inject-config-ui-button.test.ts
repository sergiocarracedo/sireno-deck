import { describe, expect, it } from "vitest"

import { injectConfigUiButton } from "../inject-config-ui-button"

describe("injectConfigUiButton", () => {
  it("adds config actions to every compact settings page without replacing version", () => {
    const pages = [
      "internal-settings:settings",
      "internal-settings:settings-p2",
    ].map((id) => ({
      id,
      name: "Settings",
      buttons: [
        {
          id: "app-info",
          type: "internal-settings:compact-app-info",
          position: 0,
        },
      ],
    }))
    const result = injectConfigUiButton(pages, "http://localhost/#/config", 6)
    for (const deck of result) {
      expect(deck.buttons).toContainEqual({
        id: "app-info",
        type: "internal-settings:compact-app-info",
        position: 0,
        actions: { tap: "url://http://localhost/#/config" },
      })
    }
  })

  it("adds Config UI to every larger settings page", () => {
    const pages = [
      "internal-settings:settings",
      "internal-settings:settings-p2",
    ].map((id) => ({ id, name: "Settings", buttons: [] }))
    expect(
      injectConfigUiButton(pages, "http://localhost/#/config", 15).every(
        (deck) =>
          deck.buttons.some(
            (button) => button.id === "config-ui" && button.position === 3,
          ),
      ),
    ).toBe(true)
  })
  it("adds a tokenized URL action to the internal Settings deck only", () => {
    const settings = {
      id: "internal-settings:settings",
      name: "Settings",
      buttons: [
        { id: "brightness-up", type: "internal-settings:brightness-up" },
      ],
    }
    const main = { id: "main", name: "Main", buttons: [] }
    const result = injectConfigUiButton(
      [settings, main],
      "http://127.0.0.1:52938/?token=abc#/config",
    )

    expect(result[0]?.buttons).toContainEqual({
      id: "config-ui",
      type: "core:action",
      position: 3,
      config: { label: "Config UI", icon: "icon://settings" },
      actions: { tap: "url://http://127.0.0.1:52938/?token=abc#/config" },
    })
    expect(result[1]).toEqual(main)
    expect(settings.buttons).toHaveLength(1)
  })
})
