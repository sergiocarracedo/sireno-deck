import { defineMountedButton, Text } from 'sireno-deck-cli'
import { z } from 'zod'

const ShrinkFitReviewButtonSchema = z
  .object({
    label: z.string().min(1),
    size: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl']).optional(),
  })
  .strict()

const shrinkFitReviewButton = defineMountedButton({
  configSchema: ShrinkFitReviewButtonSchema,
  render: ({ config }) => (
    <div className="flex h-full w-full items-center justify-center px-2 py-1.5">
      <Text
        align="center"
        className="w-full"
        fit="shrink"
        size={config.size ?? '2xl'}
        tone="foreground"
        typography="main"
      >
        {config.label}
      </Text>
    </div>
  ),
  type: 'phase-22-shrink-fit-review',
})

const addon = {
  apiVersion: 1,
  buttons: [shrinkFitReviewButton],
  name: 'phase-22-shrink-fit-review-addon',
}

export default addon
