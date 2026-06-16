import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { getCurrentBrightness, setBrightnessAll } from '@/device/registry'
import { IconLabelSurface } from '@/ui/index'
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
      <IconLabelSurface
        icon={{ name: 'sun', size: 32 }}
        label="Brighter"
        data-sireno-settings-button="brightness-up"
      />
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_brightness_up',
})
