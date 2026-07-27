import { type ReactElement } from "react"

import { Icon } from "@/ui/primitives/Icon"
import { Label } from "@/ui/primitives/Label"
import { IconLabelSurface } from "@/ui/surfaces/IconLabelSurface"
import { TemporaryErrorSurface } from "@/ui/surfaces/TemporaryErrorSurface"

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
  },
}

export const SYSTEM_BUTTON_LABELS: ReadonlyArray<string> = SYSTEM_BUTTON_TYPES

export const isSystemButton = (type: string): type is SystemButtonType =>
  isSystemButtonType(type)

const FALLBACK_ERROR_DETAILS = "check logs"

export const renderSystemButton = (
  type: string,
  iconOverride?: string,
  details?: string,
  labelOverride?: string,
): ReactElement | null => {
  if (!isSystemButtonType(type)) return null
  const layout = SYSTEM_BUTTON_LAYOUT[type]
  if (type === "core:temporary-error") {
    return (
      <TemporaryErrorSurface
        source={iconOverride ?? layout.source}
        label={layout.label}
        details={details ?? layout.details ?? FALLBACK_ERROR_DETAILS}
      />
    )
  }
  return (
    <IconLabelSurface
      source={iconOverride ?? layout.source}
      label={labelOverride ?? layout.label}
      {...(details !== undefined
        ? { details }
        : layout.details !== undefined
          ? { details: layout.details }
          : {})}
    />
  )
}

interface OverlayToggleSurfaceProps {
  deckIcon: string
}

const OverlayToggleSurface = ({
  deckIcon,
}: OverlayToggleSurfaceProps): ReactElement => {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1"
      data-sireno-overlay-toggle="true"
    >
      <div className="flex items-center gap-1">
        <Icon source={deckIcon} size={26} />
        <Icon source="icon://slash" size={14} />
        <Icon source="icon://layers" size={26} />
      </div>
      <Label text="Toggle overlay" lines={2} />
    </div>
  )
}

export const renderOverlayToggleButton = (deckIcon: string): ReactElement => (
  <OverlayToggleSurface deckIcon={deckIcon} />
)
