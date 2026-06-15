import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { getCurrentBrightness } from '@/device/registry'
import { Text } from '@/ui/index'
import { z } from 'zod'

const CURRENT_BRIGHTNESS_RENDER_INTERVAL_MS = 1_000

export const InternalSettingsCurrentBrightnessButtonSchema = z.object({})

export const internalSettingsCurrentBrightnessButton = defineMountedButton({
  configSchema: InternalSettingsCurrentBrightnessButtonSchema,
  defaultRenderIntervalMs: () => CURRENT_BRIGHTNESS_RENDER_INTERVAL_MS,
  render: () => (
    <ButtonSurface>
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-0.5"
        data-sireno-settings-button="current-brightness"
      >
        <Text size="xl" tone="primary">{`${getCurrentBrightness()}%`}</Text>
        <Text size="xs">Brightness</Text>
      </div>
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_current_brightness',
})
