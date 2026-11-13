import type { ReactElement } from "react"
import type { ChipTone } from "../primitives/Chip"
import { Icon } from "../primitives/Icon"
import { Label } from "../primitives/Label"
import { Text } from "../primitives/Text"
import { StatusIndicator } from "../primitives/StatusIndicator"

export interface BinaryToggleSurfaceProps {
  label: string
  labelColor?: string
  source?: string
  variant?: ChipTone
  status: boolean
  details?: string
}

export function BinaryToggleSurface({
  label,
  labelColor,
  source,
  variant = "accent",
  status,
  details,
}: BinaryToggleSurfaceProps): ReactElement {
  return (
    <div
      className={`relative isolate grid h-full w-full min-w-0 grid-rows-[minmax(0,1fr)_auto] pb-1 ${
        status
          ? ""
          : "before:absolute before:-inset-2 before:-z-10 before:bg-black/40 before:content-['']"
      }`}
    >
      <div className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden">
        {source ? <Icon source={source} size={24} /> : null}
        <Text
          text={label}
          weight="bold"
          fit={{ type: "fit", lines: 2, ellipsis: true }}
          style={labelColor ? { color: labelColor } : undefined}
        />
        {details ? <Label text={details} variant="small" /> : null}
      </div>
      <div className="flex justify-center self-end">
        <StatusIndicator
          label={status ? "On" : "Off"}
          tone={status ? variant : "danger"}
          glow={status}
        />
      </div>
    </div>
  )
}
