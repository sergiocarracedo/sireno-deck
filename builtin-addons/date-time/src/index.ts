import { createElement } from "react"
import { z } from "zod"

import type { SirenoAddon } from "../../../packages/cli/src/addon/api.js"

const DIGITAL_DATE_TIME_INTERVAL_MS = 1000

const BuiltinDisplayDateTimeButtonSchema = z
  .object({
    variant: z.enum(["date", "time", "date-time"]).default("date-time"),
    date_format: z.string().min(1).optional().default("MM/DD/YYYY"),
    time_format: z.string().min(1).optional().default("HH:mm:ss"),
  })
  .strict()

function formatDigitalDateTimeLabel(config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>, date = new Date()): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle:
      config.variant === "date" || config.variant === "date-time"
        ? "short"
        : undefined,
    timeStyle:
      config.variant === "time" || config.variant === "date-time"
        ? "short"
        : undefined,
  })

  return formatter.format(date)
}

const builtinDisplayDateTimeButton = {
  configSchema: BuiltinDisplayDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>
  }) => ({
    render: () =>
      createElement("deck-button", {
        keyIndex: button.position,
        label: formatDigitalDateTimeLabel(config),
      }),
  }),
  type: "date-time",
}

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinDisplayDateTimeButton],
  name: "date-time",
}

export default datetimeButtonsAddon

export {
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
}
