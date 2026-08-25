import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelSurface, PaginatedSurface, type PaginatedPage } from "@/ui"
import { cityKey } from "../../provider/city-key"
import type {
  WeatherSnapshot,
  WeatherStateSnapshot,
} from "../../provider/types"
import type { ConfigSchema } from "./config"
import { type WeatherPageProps, weatherPageRenderers } from "./pages"

const AUTO_RETURN_MS = 10_000

const lookupKey = (loc: NonNullable<ConfigSchema["location"]>) =>
  typeof loc === "string" ? loc : cityKey(loc)

const WeatherButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
  gesture,
}) => {
  const name =
    typeof config?.location === "object"
      ? config.location.name
      : config?.location
  const { data } = useAddonChannel<WeatherStateSnapshot>("weather:current")

  const loc = config?.location
  const snapshot: WeatherSnapshot | undefined =
    loc !== undefined && data?.byCity !== undefined
      ? data.byCity[lookupKey(loc)]
      : undefined

  if (!snapshot?.available) {
    return <IconLabelSurface source="icon://cloud-off" label="---" />
  }

  const unitTemp = snapshot.units === "imperial" ? "°F" : "°C"
  const unitWind = snapshot.units === "imperial" ? "mph" : "km/h"

  const weatherProps: WeatherPageProps = {
    snapshot,
    unitTemp,
    unitWind,
    city: name,
  }

  const pages: PaginatedPage<WeatherPageProps>[] = weatherPageRenderers.map(
    (render) => ({
      render,
      config: weatherProps,
    }),
  )

  return (
    <PaginatedSurface
      pages={pages}
      gesture={gesture}
      autoReturnMs={AUTO_RETURN_MS}
    />
  )
}

export default WeatherButtonFrontend
