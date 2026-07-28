import { useAddonChannel } from "@/api/react"
import { IconLabelSurface } from "@/ui/surfaces/IconLabelSurface"
import { Text } from "@/ui/primitives/Text"
import type { AddonFrontendButton } from "@/addon/api"

import type { ConfigSchema, StatusToggleConfig } from "./config"
import { isLegacyToggleConfig, isStatusToggleConfig } from "./config"
import {
  TOGGLE_STATES_CHANNEL,
  type ToggleStatesPayload,
} from "./global-service"

const fallback = (label: string): React.ReactElement => (
  <Text tone="muted" text={label} />
)

const ToggleButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
  buttonId,
}) => {
  if (isLegacyToggleConfig(config)) {
    return fallback("—")
  }
  if (!isStatusToggleConfig(config)) {
    return fallback("—")
  }
  return <StatusToggleRenderer config={config} buttonId={buttonId} />
}

function StatusToggleRenderer({
  config,
  buttonId,
}: {
  config: StatusToggleConfig
  buttonId: string
}) {
  const { data } = useAddonChannel<ToggleStatesPayload>(TOGGLE_STATES_CHANNEL)
  const entry = data?.byButton[buttonId] ?? undefined
  if (entry === undefined || entry === null) {
    return fallback("…")
  }
  if (entry.error !== undefined) {
    return fallback("err")
  }
  const matched =
    entry.state !== undefined ? config.states[entry.state] : undefined
  if (matched !== undefined) {
    const label = matched.label ?? entry.state ?? ""
    return <IconLabelSurface source={matched.icon} label={label} />
  }
  if (entry.raw.length === 0) {
    return fallback("…")
  }
  return fallback(entry.raw)
}

export default ToggleButtonFrontend
