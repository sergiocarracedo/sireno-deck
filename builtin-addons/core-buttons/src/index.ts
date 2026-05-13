import { createElement } from "react"
import { z } from "zod"

const BuiltinDisplayTextButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()

const builtinDisplayTextButton = {
  configSchema: BuiltinDisplayTextButtonSchema,
  createInstance: ({ button, config }: { button: { position: number }; config: z.infer<typeof BuiltinDisplayTextButtonSchema> }) => ({
    render: () => createElement("deck-button", {
      ...(config.icon !== undefined ? { icon: config.icon } : {}),
      keyIndex: button.position,
      label: config.label,
    }),
  }),
  type: "builtin-display-text",
}

const coreButtonsAddon = {
  apiVersion: 1,
  buttons: [builtinDisplayTextButton],
  name: "core-buttons",
}

export default coreButtonsAddon
