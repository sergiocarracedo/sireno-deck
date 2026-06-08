import { getCurrentBrightness, setBrightnessAll } from "@/device/registry"
import { Icon, Text } from "@/ui/index"
import { LogoVersion } from "@/ui/LogoVersion"

import type { ReactElement } from "react"

const BRIGHTNESS_STEP = 10

export function nextBrightnessUp(current: number): number {
  return Math.min(100, current + BRIGHTNESS_STEP)
}

export function nextBrightnessDown(current: number): number {
  return Math.max(0, current - BRIGHTNESS_STEP)
}

export function renderSettingsButton(buttonId: string): ReactElement {
  switch (buttonId) {
    case "brightness-up":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1"
          data-sireno-settings-button="brightness-up"
          onClick={async () => {
            await setBrightnessAll(nextBrightnessUp(getCurrentBrightness()))
          }}
        >
          <Icon icon="sun" size={32} />
          <Text size="xs">Brighter</Text>
        </div>
      )
    case "brightness-down":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1"
          data-sireno-settings-button="brightness-down"
          onClick={async () => {
            await setBrightnessAll(nextBrightnessDown(getCurrentBrightness()))
          }}
        >
          <Icon icon="moon" size={32} />
          <Text size="xs">Dimmer</Text>
        </div>
      )
    case "current-brightness":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-0.5"
          data-sireno-settings-button="current-brightness"
        >
          <Text size="xl" tone="primary">
            {`${getCurrentBrightness()}%`}
          </Text>
          <Text size="xs">Brightness</Text>
        </div>
      )
    case "logo-version":
      return <LogoVersion />
    default:
      return (
        <div
          className="flex h-full w-full items-center justify-center"
          data-sireno-settings-button="empty"
        />
      )
  }
}
