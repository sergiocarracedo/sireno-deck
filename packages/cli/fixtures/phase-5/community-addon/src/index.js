import { createElement } from "react"
import { z } from "zod"

const CommunityWaveButtonSchema = z
  .object({
    label: z.string().min(1),
  })
  .strict()

const communityAddon = {
  apiVersion: 1,
  buttons: [
    {
      configSchema: CommunityWaveButtonSchema,
      createInstance({ button, config }) {
        return {
          render() {
            return createElement("deck-button", {
              keyIndex: button.position,
              label: config.label,
            })
          },
        }
      },
      type: "community-wave-button",
    },
  ],
  name: "@sireno-deck/community-addon",
}

export default communityAddon
