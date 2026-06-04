import { ButtonSurface } from "@/addon/api"
import { Text } from "@/ui"
import type { ThemeMediaPlayerSurfaceProps } from "@/config/theme/schemas"

export function CustomMediaPlayerSurface(props: ThemeMediaPlayerSurfaceProps) {
  return (
    <ButtonSurface>
      <div
        data-test-theme-media-player-surface="true"
        className="flex h-full w-full flex-col items-center justify-center gap-1"
      >
        <Text align="center" size="sm" tone="primary">
          {props.title}
        </Text>
        <Text align="center" size="xs" tone="foreground">
          {props.artist}
        </Text>
        <Text align="center" size="xs" tone="accent">
          {props.source}
        </Text>
      </div>
    </ButtonSurface>
  )
}

export const surface = CustomMediaPlayerSurface

export default CustomMediaPlayerSurface
