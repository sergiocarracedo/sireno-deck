import { createElement } from "react"
import { z } from "zod"

const LocalClockButtonSchema = z
  .object({
    label: z.string().min(1),
  })
  .strict()

const localClockAddon = {
  apiVersion: 1,
  buttons: [
    {
      configSchema: LocalClockButtonSchema,
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
      type: "local-clock-button",
    },
  ],
  name: "local-clock-addon",
}

export default localClockAddon
