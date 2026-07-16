import { type ReactElement } from "react"

import { IconLabelSurface } from "@/ui/surfaces/IconLabelSurface"

import {
  SYSTEM_BUTTON_TYPES,
  isSystemButtonType,
  type SystemButtonType,
} from "./types"

const SYSTEM_BUTTON_LAYOUT: Record<
  SystemButtonType,
  { source: string; label: string; details?: string }
> = {
  "core:back": { source: "icon://arrow-left", label: "Back" },
  "core:settings-entry": { source: "icon://settings", label: "Settings" },
  "core:overlay-toggle": { source: "icon://layers", label: "Overlay" },
  "core:next-page": { source: "icon://chevrons-right", label: "Next" },
  "core:temporary-error": {
    source: "icon://triangle-alert",
    label: "Error",
    details: "check logs",
  },
}

export const SYSTEM_BUTTON_LABELS: ReadonlyArray<string> = SYSTEM_BUTTON_TYPES

export const isSystemButton = (type: string): type is SystemButtonType =>
  isSystemButtonType(type)

export const renderSystemButton = (type: string): ReactElement | null => {
  if (!isSystemButtonType(type)) return null
  const layout = SYSTEM_BUTTON_LAYOUT[type]
  return (
    <IconLabelSurface
      source={layout.source}
      label={layout.label}
      {...(layout.details !== undefined ? { details: layout.details } : {})}
    />
  )
}
