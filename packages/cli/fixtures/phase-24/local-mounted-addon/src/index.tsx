import { createElement } from "react"
import { defineMountedButton } from "../../../../src/addon/api.js"

const addon = {
  apiVersion: 1,
  name: "phase-24-local-mounted-addon",
  buttons: [
    defineMountedButton({
      configSchema: {
        safeParse(value: unknown) {
          return { success: true as const, data: value as { label: string } }
        },
      },
      onTap({ methods }) {
        methods.invalidate()
      },
      render({ button, config, frameState, pressed }) {
        return createElement("p", null, `${config.label}:${button.type}:${frameState}:${pressed ? "down" : "up"}`)
      },
      type: "phase-24-mounted-button",
    }),
  ],
}

export default addon
