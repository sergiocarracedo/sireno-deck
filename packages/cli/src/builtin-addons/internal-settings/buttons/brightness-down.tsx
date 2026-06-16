import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { getCurrentBrightness, setBrightnessAll } from '@/device/registry'
import { IconLabelSurface } from '@/ui/index'
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
      <IconLabelSurface
        icon={{ name: 'moon', size: 32 }}
        label="Dimmer"
        data-sireno-settings-button="brightness-down"
      />
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_brightness_down',
})
