import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { Text } from '@/ui/index'
import { z } from 'zod'

export const InternalSettingsLogoVersionButtonSchema = z.object({})

export const internalSettingsLogoVersionButton = defineMountedButton({
  configSchema: InternalSettingsLogoVersionButtonSchema,
  render: () => (
    <ButtonSurface>
      <div
        className="sireno-logo-version flex h-full w-full flex-col items-center justify-center gap-0.5"
        data-sireno-settings-button="logo-version"
      >
        <Text size="xl" tone="primary">sireno</Text>
        <Text size="xs">v1</Text>
      </div>
    </ButtonSurface>
  ),
  type: '__sireno_internal_settings_logo_version',
})
