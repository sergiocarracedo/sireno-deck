/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ChannelRegistry } from "@/api/react/registry"
import WeatherButtonFrontend from "../buttons/weather/frontend"
import type { WeatherStateSnapshot } from "../buttons/weather/config"

beforeEach(() => ChannelRegistry.resetForTests())
afterEach(() => ChannelRegistry.resetForTests())

type WeatherConfig = Partial<{
  location: { latitude: number; longitude: number; name?: string }
  units: "metric" | "imperial"
}>

const renderButton = (config: WeatherConfig) => {
  return render(
    <WeatherButtonFrontend
      // @ts-expect-error test config is partial
      config={config}
      state={null}
      addonName="weather"
      buttonType="weather:weather"
      buttonId="0"
    />,
  )
}

describe("WeatherButtonFrontend", () => {
  it("renders fallback text when no data published", () => {
    const { getByText } = renderButton({})
    expect(getByText("Weather")).toBeTruthy()
  })

  it("renders fallback with city name when no data published but name in config", () => {
    const { getByText } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006, name: "New York" },
    })
    expect(getByText("New York")).toBeTruthy()
  })

  it("renders weather data for matching city key", () => {
    const snapshot: WeatherStateSnapshot = {
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

    const { getByText, getByRole } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006 },
    })

    expect(getByText("22°C")).toBeTruthy()
    act(() => {
      getByRole("button").click()
    })
    expect(getByText("Clear")).toBeTruthy()
  })

  it("renders fallback when city key not found in byCity map", () => {
    const snapshot: WeatherStateSnapshot = {
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

    expect(getByText("Weather")).toBeTruthy()
  })

  it("renders unavailable when snapshot available=false", () => {
    const snapshot: WeatherStateSnapshot = {
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

    expect(getByText("Weather")).toBeTruthy()
  })

  it("renders wind speed chip", () => {
    const snapshot: WeatherStateSnapshot = {
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

    const { getByText, getByRole } = renderButton({
      location: { latitude: 40.7128, longitude: -74.006 },
    })

    act(() => {
      getByRole("button").click()
    })
    expect(getByText("12 km/h")).toBeTruthy()
  })
})
