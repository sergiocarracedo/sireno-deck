import { describe, expect, it } from "vitest"

import { positionSettingsVersionButton } from "../position-settings-version-button"

describe("positionSettingsVersionButton", () => {
  it.each([15, 6])(
    "places the version button at N-2 on a %i-key device",
    (keyCount) => {
      const decks = positionSettingsVersionButton(
        [
          {
            id: "internal-settings:settings",
            name: "Settings",
            buttons: [
              {
                id: "app-info",
                type: "internal-settings:app-info",
                position: 2,
              },
            ],
          },
        ],
        keyCount,
      )

      expect(decks[0]?.buttons[0]?.position).toBe(keyCount - 2)
    },
  )

  it("leaves other decks and buttons untouched", () => {
    const regularDeck = {
      id: "main",
      name: "Main",
      buttons: [
        { id: "version", type: "internal-settings:app-info", position: 2 },
      ],
    }

    expect(positionSettingsVersionButton([regularDeck], 15)[0]).toBe(
      regularDeck,
    )
  })
})
