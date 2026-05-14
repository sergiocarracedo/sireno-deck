import { describe, expect, it, vi } from "vitest"

import dateTimeAddon, {
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
} from "./index.js"

describe("date-time addon", () => {
  it("exports a bundled date-time button definition with a zod schema", () => {
    expect(dateTimeAddon.name).toBe("date-time")
    expect(dateTimeAddon.apiVersion).toBe(1)

    const definition = dateTimeAddon.buttons[0]
    const config = definition?.configSchema.parse({ variant: "date-time" })

    expect(definition?.type).toBe("date-time")
    expect(definition?.defaultIntervalMs).toBe(DIGITAL_DATE_TIME_INTERVAL_MS)
    expect(config).toEqual({
      date_format: "MM/DD/YYYY",
      time_format: "HH:mm:ss",
      variant: "date-time",
    })
  })

  it("formats labels through Intl.DateTimeFormat", () => {
    const formatSpy = vi.spyOn(Intl, "DateTimeFormat")
    const date = new Date("2026-05-14T10:48:00.000Z")

    formatDigitalDateTimeLabel({
      date_format: "MM/DD/YYYY",
      time_format: "HH:mm:ss",
      variant: "time",
    }, date)

    expect(formatSpy).toHaveBeenCalledWith(undefined, expect.objectContaining({ timeStyle: "short" }))
  })

  it("creates a renderable live date-time button instance", () => {
    const definition = dateTimeAddon.buttons[0]
    const instance = definition?.createInstance({
      button: { position: 2 },
      config: {
        date_format: "MM/DD/YYYY",
        time_format: "HH:mm:ss",
        variant: "date-time",
      },
    } as never)

    expect(instance?.render()).toMatchObject({
      props: {
        keyIndex: 2,
        label: expect.any(String),
      },
      type: "deck-button",
    })
  })
})
