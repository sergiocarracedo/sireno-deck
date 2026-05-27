import { ButtonSurface, defineMountedButton } from "sireno-deck-cli"

import { Phase23ButtonContent } from "./content.js"

const passthroughSchema = {
  safeParse(value: unknown) {
    return { data: value as { label?: string }, success: true as const }
  },
}

const addon = {
  apiVersion: 1,
  name: "phase-23-local-raw-addon",
  buttons: [
    defineMountedButton({
      configSchema: passthroughSchema,
      render({ config }) {
        return (
          <ButtonSurface>
            <Phase23ButtonContent label={typeof config.label === "string" ? config.label : "Phase 23"} />
          </ButtonSurface>
        )
      },
      type: "phase-23-local-raw-button",
    }),
  ],
}

export default addon
