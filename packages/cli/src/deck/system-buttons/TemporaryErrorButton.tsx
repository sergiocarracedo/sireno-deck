import { ButtonSurface, MountedAddonButtonRenderProps } from '@/addon/api'
import { ButtonInstance } from '@/core/schemas'
import { Text } from '@/ui'
import { z } from 'zod'

const temporaryErrorButtonDefinition = {
  configSchema: z.object({
    detailLines: z.array(z.string().min(1)).default([]),
    label: z.string().min(1),
    subtitle: z.string().min(1),
  }),
  render: ({
    button,
    config,
  }: MountedAddonButtonRenderProps<{
    detailLines: string[]
    label: string
    subtitle: string
  }>) => {
    return (
      <ButtonSurface full>
        <div className="flex flex-col items-center justify-center w-full h-full gap-1">
          <Text fit="wrap">{config.label}</Text>
          <Text fit="wrap">{config.subtitle}</Text>
          {config.detailLines.map((line, index) => (
            <Text fit="wrap" key={`${button.position}-${index}`}>
              line
            </Text>
          ))}
        </div>
      </ButtonSurface>
    )
  },
  type: '__runtime_reload_error__',
} satisfies ButtonInstance['definition']

export { temporaryErrorButtonDefinition }
