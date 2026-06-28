export const statusesMeta = {
  pause: {
    icon: "pause",
    bgColor: "bg-muted/30",
    bgColorAlt: "bg-muted/10",
  },
  play: {
    icon: "play",
    bgColor: "bg-accent/30",
    bgColorAlt: "bg-accent/10",
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
} as const;

export type MediaButtonStatus = keyof typeof statusesMeta;
