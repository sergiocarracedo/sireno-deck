import { createElement } from "react"
import { z } from "zod"

const VersionMismatchButtonSchema = z
  .object({
    label: z.string().min(1),
  })
  .strict()

const versionMismatchAddon = {
  apiVersion: 99,
  buttons: [
    {
      configSchema: VersionMismatchButtonSchema,
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
      type: "version-mismatch-button",
    },
  ],
  name: "version-mismatch-addon",
}

export default versionMismatchAddon
