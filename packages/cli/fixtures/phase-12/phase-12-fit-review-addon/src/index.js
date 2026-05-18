import { createElement } from "react"
import { z } from "zod"

const FitReviewButtonSchema = z
  .object({
    fit: z.enum(["wrap"]).optional(),
    label: z.string().min(1),
  })
  .strict()

const reviewAddon = {
  apiVersion: 1,
  buttons: [
    {
      configSchema: FitReviewButtonSchema,
      createInstance({ button, config }) {
        return {
          render() {
            return createElement("deck-button", {
              ...(config.fit !== undefined ? { fit: config.fit } : {}),
              keyIndex: button.position,
              label: config.label,
              wrapper: "shared",
            })
          },
        }
      },
      type: "phase-12-fit-review",
    },
  ],
  name: "phase-12-fit-review-addon",
}

export default reviewAddon
