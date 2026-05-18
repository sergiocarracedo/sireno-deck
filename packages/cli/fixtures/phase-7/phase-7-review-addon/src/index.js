import { createElement } from "react"
import { z } from "zod"

const ReviewButtonSchema = z
  .object({
    label: z.string().min(1),
    subtitle: z.string().min(1).optional(),
  })
  .strict()

const reviewAddon = {
  apiVersion: 1,
  buttons: [
    {
      configSchema: ReviewButtonSchema,
      createInstance({ button, config }) {
        return {
          render() {
            return createElement("deck-button", {
              fit: "shrink",
              keyIndex: button.position,
              label: config.label,
              subtitle: config.subtitle,
              wrapper: "shared",
            })
          },
        }
      },
      type: "phase-7-shared-wrapper-button",
    },
    {
      configSchema: ReviewButtonSchema,
      createInstance({ button, config }) {
        return {
          render() {
            return createElement("deck-button", {
              keyIndex: button.position,
              label: config.label,
              subtitle: config.subtitle,
              variant: "toggle",
            })
          },
        }
      },
      type: "phase-7-bespoke-button",
    },
  ],
  name: "phase-7-review-addon",
}

export default reviewAddon
