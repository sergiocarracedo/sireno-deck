import {
  ButtonSurface,
  Chip,
  Icon,
  Text,
} from "sireno-deck-cli"

export const componentFirstButton = (
  <div className="flex flex-col items-center justify-center gap-1">
    <Icon icon="clock" tone="primary" />
    <Text fit="wrap">Clock</Text>
  </div>
)

export const componentFirstSurface = (
  <ButtonSurface full_surface>
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <Chip tone="accent">Live</Chip>
      <Text fit="wrap">Date Today</Text>
    </div>
  </ButtonSurface>
)

export const componentFirstText = <Text fit="wrap">10:48</Text>
