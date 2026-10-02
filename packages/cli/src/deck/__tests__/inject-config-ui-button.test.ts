import { describe, expect, it } from "vitest"

import { injectConfigUiButton } from "../inject-config-ui-button"

describe("injectConfigUiButton", () => {
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
