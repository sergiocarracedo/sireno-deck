import { useEffect, useRef, useState } from 'react'

import type { AddonFrontendButton } from '@/addon/api'
import { useAddonChannel } from '@/api/react'
import { IconLabelSurface } from '@/ui/index'
import { cityKey } from '../../provider/city-key'
import type { ConfigSchema, WeatherStateSnapshot } from './config'
import { pages } from './pages'

const AUTO_RETURN_MS = 10_000

const lookupKey = (loc: NonNullable<ConfigSchema['location']>) =>
  typeof loc === 'string' ? loc : cityKey(loc)

const WeatherButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => {
  const [page, setPage] = useState(0)
  const [pageChangedAt, setPageChangedAt] = useState<number | undefined>()

  const name =
    typeof config?.location === 'object'
      ? config.location.name
      : config?.location
  const { data } = useAddonChannel<WeatherStateSnapshot>('weather:current')
  const lastDataRef = useRef(data)

  const loc = config?.location
  const snapshot: WeatherStateSnapshot | undefined =
    loc !== undefined && data?.byCity !== undefined
      ? data.byCity[lookupKey(loc)]
      : undefined

  useEffect(() => {
    if (page === 0 || pageChangedAt === undefined) return
    const now = Date.now()
    if (now - pageChangedAt >= AUTO_RETURN_MS) {
      setPage(0)
      setPageChangedAt(undefined)
    }
  }, [page, pageChangedAt])

  useEffect(() => {
    if (lastDataRef.current !== data && lastDataRef.current !== undefined) {
      const nextPage = (page + 1) % pages.length
      setPage(nextPage)
      setPageChangedAt(nextPage === 0 ? undefined : Date.now())
    }
    lastDataRef.current = data
  }, [data, page])

  if (!snapshot?.available) {
    return (
      <IconLabelSurface
        icon="icon://cloud-off"
        label="---"
        tone="primary"
      ></IconLabelSurface>
    )
  }

  const unitTemp = snapshot.units === 'imperial' ? '°F' : '°C'
  const unitWind = snapshot.units === 'imperial' ? 'mph' : 'km/h'

  return (pages[page] ?? pages[0]).render({
    snapshot,
    unitTemp,
    unitWind,
    city: name,
  })
}

export default WeatherButtonFrontend
