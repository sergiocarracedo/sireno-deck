import { useEffect, useState } from "react"

import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelSurface } from "@/ui/index"
import { cityKey } from "../../provider/city-key"
import type { WeatherSnapshot } from "../../provider/types"
import type { ConfigSchema } from "./config"
import { pages } from "./pages"

const AUTO_RETURN_MS = 10_000

const lookupKey = (loc: NonNullable<ConfigSchema["location"]>) =>
  typeof loc === "string" ? loc : cityKey(loc)

const WeatherButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
  gesture,
}) => {
  const [page, setPage] = useState(0)
  const [pageChangedAt, setPageChangedAt] = useState<number | undefined>()

  const name =
    typeof config?.location === "object"
      ? config.location.name
      : config?.location
  const { data } = useAddonChannel<WeatherSnapshot>("weather:current")

  const loc = config?.location
  const snapshot: WeatherSnapshot | undefined =
    loc !== undefined && data?.byCity !== undefined
      ? data.byCity[lookupKey(loc)]
      : undefined

  useEffect(() => {
    if (gesture?.gesture !== "tap") {
      return
    }
    const nextPage = (page + 1) % pages.length
    setPage(nextPage)
    setPageChangedAt(nextPage === 0 ? undefined : Date.now())
  }, [gesture?.at])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0 || pageChangedAt === undefined) return
      const now = Date.now()
      if (now - pageChangedAt >= AUTO_RETURN_MS) {
        setPage(0)
        setPageChangedAt(undefined)
      }
    }, AUTO_RETURN_MS)

    return () => clearTimeout(timer)
  }, [page, pageChangedAt])

  if (!snapshot?.available) {
    return (
      <IconLabelSurface
        source="icon://cloud-off"
        label="---"
        tone="primary"
      ></IconLabelSurface>
    )
  }

  const unitTemp = snapshot.units === "imperial" ? "°F" : "°C"
  const unitWind = snapshot.units === "imperial" ? "mph" : "km/h"

  return pages[page]!.render({
    snapshot,
    unitTemp,
    unitWind,
    city: name,
  })
}

export default WeatherButtonFrontend
