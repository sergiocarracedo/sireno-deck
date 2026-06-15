import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { getCurrentBrightness, setBrightnessAll } from '@/device/registry'
import { Icon, Text } from '@/ui/index'
import { z } from 'zod'

const BRIGHTNESS_STEP = 10

export function nextBrightnessUp(current: number): number {
  return Math.min(100, current + BRIGHTNESS_STEP)
}

export const InternalSettingsBrightnessUpButtonSchema = z.object({})

export const internalSettingsBrightnessUpButton = defineMountedButton({
  configSchema: InternalSettingsBrightnessUpButtonSchema,
  onTap: async () => {
    await setBrightnessAll(nextBrightnessUp(getCurrentBrightness()))
  },
  render: () => (
    <ButtonSurface>
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1"
        data-sireno-settings-button="brightness-up"
      >
        <Icon name="sun" size={32} />
        <Text size="xs">Brighter</Text>
      </div>
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_brightness_up',
})
