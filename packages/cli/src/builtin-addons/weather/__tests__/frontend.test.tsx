/** @vitest-environment jsdom */
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ChannelRegistry } from "@/api/react/registry"
import WeatherButtonFrontend from "../buttons/weather/frontend"
import type { WeatherSnapshot } from "../../provider/types"

beforeEach(() => ChannelRegistry.resetForTests())
afterEach(() => ChannelRegistry.resetForTests())

type WeatherConfig = Partial<{
  location: { latitude: number; longitude: number; name?: string }
  units: "metric" | "imperial"
}>

let gestureAt = 0

const renderButton = (
  config: WeatherConfig,
  gesture?: { gesture: "tap"; at: number } | null,
) => {
  return render(
    <WeatherButtonFrontend
      // @ts-expect-error test config is partial
      config={config}
      state={null}
      addonName="weather"
      buttonType="weather:weather"
      buttonId="0"
      gesture={gesture}
    />,
  )
}

describe("WeatherButtonFrontend", () => {
  it("renders fallback when no data published", () => {
    const { getByText } = renderButton({})
    expect(getByText("---")).toBeTruthy()
  })

  it("renders fallback when no data published even with city name in config", () => {
    const { getByText } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006, name: "New York" },
    })
    expect(getByText("---")).toBeTruthy()
  })

  it("renders weather data for matching city key", () => {
    const snapshot: { byCity: Record<string, WeatherSnapshot> } = {
      byCity: {
        "40.71,-74.01": {
          available: true,
          temperature: 22,
          windSpeed: 12,
          description: "Clear",
          wmoCode: 0,
          units: "metric",
        },
      },
    }
    act(() => {
      ChannelRegistry.instance().publish("weather:current", snapshot)
    })

    const { getByText, rerender } = renderButton(
      { location: { latitude: 40.7128, longitude: -74.006 } },
      undefined,
    )

    expect(getByText("22°C")).toBeTruthy()

    rerender(
      <WeatherButtonFrontend
        // @ts-expect-error test config is partial
        config={{ location: { latitude: 40.7128, longitude: -74.006 } }}
        state={null}
        addonName="weather"
        buttonType="weather:weather"
        buttonId="0"
        gesture={{ gesture: "tap", at: ++gestureAt }}
      />,
    )
    expect(getByText("Clear")).toBeTruthy()
  })

  it("renders fallback when city key not found in byCity map", () => {
    const snapshot: { byCity: Record<string, WeatherSnapshot> } = {
      byCity: {
        "51.51,-0.13": {
          available: true,
          temperature: 15,
          windSpeed: 8,
          description: "Cloudy",
          wmoCode: 3,
          units: "metric",
        },
      },
    }
    act(() => {
      ChannelRegistry.instance().publish("weather:current", snapshot)
    })

    const { getByText } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006 },
    })

    expect(getByText("---")).toBeTruthy()
  })

  it("renders unavailable when snapshot available=false", () => {
    const snapshot: { byCity: Record<string, WeatherSnapshot> } = {
      byCity: {
        "40.71,-74.01": {
          available: false,
          description: "fetch failed",
          units: "metric",
        },
      },
    }
    act(() => {
      ChannelRegistry.instance().publish("weather:current", snapshot)
    })

    const { getByText } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006 },
    })

    expect(getByText("---")).toBeTruthy()
  })

  it("renders wind speed chip on second page", () => {
    const snapshot: { byCity: Record<string, WeatherSnapshot> } = {
      byCity: {
        "40.71,-74.01": {
          available: true,
          temperature: 22,
          windSpeed: 12,
          description: "Clear",
          wmoCode: 0,
          units: "metric",
        },
      },
    }
    act(() => {
      ChannelRegistry.instance().publish("weather:current", snapshot)
    })

    const { getByText, rerender } = renderButton(
      { location: { latitude: 40.7128, longitude: -74.006 } },
      undefined,
    )

    expect(getByText("22°C")).toBeTruthy()

    rerender(
      <WeatherButtonFrontend
        // @ts-expect-error test config is partial
        config={{ location: { latitude: 40.7128, longitude: -74.006 } }}
        state={null}
        addonName="weather"
        buttonType="weather:weather"
        buttonId="0"
        gesture={{ gesture: "tap", at: ++gestureAt }}
      />,
    )
    expect(getByText("12 km/h")).toBeTruthy()
  })
})
