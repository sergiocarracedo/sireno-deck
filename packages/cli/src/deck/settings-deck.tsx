import { getCurrentBrightness, setBrightnessAll } from '@/device/registry'
import { Icon, Text } from '@/ui/index'

import type { ReactElement } from 'react'

const BRIGHTNESS_STEP = 10
const MIN_BRIGHTNESS = 10

export function nextBrightnessUp(current: number): number {
  return Math.min(100, current + BRIGHTNESS_STEP)
}

export function nextBrightnessDown(current: number): number {
  return Math.max(MIN_BRIGHTNESS, current - BRIGHTNESS_STEP)
}

export async function handleSettingsButtonTap(buttonId: string): Promise<void> {
  switch (buttonId) {
    case 'brightness-up':
      await setBrightnessAll(nextBrightnessUp(getCurrentBrightness()))
      return
    case 'brightness-down':
      await setBrightnessAll(nextBrightnessDown(getCurrentBrightness()))
      return
    default:
      return
  }
}

export function renderSettingsButton(buttonId: string): ReactElement {
  switch (buttonId) {
    case 'brightness-up':
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1"
          data-sireno-settings-button="brightness-up"
        >
          <Icon name="sun" size={32} />
          <Text size="xs">Brighter</Text>
        </div>
      )
    case 'brightness-down':
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1"
          data-sireno-settings-button="brightness-down"
        >
          <Icon name="moon" size={32} />
          <Text size="xs">Dimmer</Text>
        </div>
      )
    case 'current-brightness':
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
    default:
      return (
        <div
          className="flex h-full w-full items-center justify-center"
          data-sireno-settings-button="empty"
        />
      )
  }
}
