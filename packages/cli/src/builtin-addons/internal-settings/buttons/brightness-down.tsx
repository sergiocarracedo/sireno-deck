import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { getCurrentBrightness, setBrightnessAll } from '@/device/registry'
import { Icon, Text } from '@/ui/index'
import { z } from 'zod'

const BRIGHTNESS_STEP = 10
const MIN_BRIGHTNESS = 10

export function nextBrightnessDown(current: number): number {
  return Math.max(MIN_BRIGHTNESS, current - BRIGHTNESS_STEP)
}

export const InternalSettingsBrightnessDownButtonSchema = z.object({})

export const internalSettingsBrightnessDownButton = defineMountedButton({
  configSchema: InternalSettingsBrightnessDownButtonSchema,
  onTap: async () => {
    await setBrightnessAll(nextBrightnessDown(getCurrentBrightness()))
  },
  render: () => (
    <ButtonSurface>
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1"
        data-sireno-settings-button="brightness-down"
      >
        <Icon name="moon" size={32} />
        <Text size="xs">Dimmer</Text>
      </div>
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_brightness_down',
})
