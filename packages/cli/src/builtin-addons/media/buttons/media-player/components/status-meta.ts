import { IconTone } from "@/ui"
import type { MediaButtonStatus } from "../../../state"

export const statusesMeta: Record<
  MediaButtonStatus,
  { icon: string; bgColor: string; bgColorAlt: string; iconColor?: IconTone }
> = {
  pause: {
    icon: "pause",
    bgColor: "bg-muted/30",
    bgColorAlt: "bg-muted/10",
  },
  play: {
    icon: "play",
    bgColor: "bg-primary",
    bgColorAlt: "bg-primary/30",
    iconColor: "foreground-contrast",
  },
  stop: {
    icon: "square",
    bgColor: "bg-danger/30",
    bgColorAlt: "bg-danger/10",
  },
  unsupported: {
    icon: "slash",
    bgColor: "bg-danger/30",
    bgColorAlt: "bg-danger/10",
  },
  notAvailable: {
    icon: "slash",
    bgColor: "bg-background/30",
    bgColorAlt: "bg-background/10",
  },
}

export type { MediaButtonStatus }
