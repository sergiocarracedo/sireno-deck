import { z } from 'zod'

import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { Bars, Text } from '@/ui/index'

const ANIMATED_BLOB_SVG = encodeURIComponent(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">',
    '<rect width="72" height="72" fill="#05070a"/>',
    '<circle cx="16" cy="20" r="18" fill="#7dd3fc" opacity="0.9">',
    '<animate attributeName="cx" values="16;56;16" dur="1.6s" repeatCount="indefinite"/>',
    '<animate attributeName="cy" values="20;52;20" dur="1.2s" repeatCount="indefinite"/>',
    '</circle>',
    '<circle cx="56" cy="52" r="14" fill="#f59e0b" opacity="0.85">',
    '<animate attributeName="cx" values="56;20;56" dur="1.4s" repeatCount="indefinite"/>',
    '<animate attributeName="cy" values="52;16;52" dur="1.8s" repeatCount="indefinite"/>',
    '</circle>',
    '<rect x="10" y="10" width="52" height="52" rx="16" fill="none" stroke="#eef2f7" stroke-opacity="0.18"/>',
    '</svg>',
  ].join(''),
)

const BuiltinMediaSampleButtonSchema = z
  .object({
    label: z.string().min(1).default('Media'),
    sample_interval_ms: z.number().int().min(250).max(2000).default(500),
  })
  .strict()

const builtinMediaSampleButton = defineMountedButton({
  configSchema: BuiltinMediaSampleButtonSchema,
  render: ({ config }) => (
    <ButtonSurface full={true} sample_interval_ms={config.sample_interval_ms}>
      <div
        className="h-full w-full overflow-hidden relative"
        style={{
          background: 'linear-gradient(180deg, #111827 0%, #020617 100%)',
        }}
      >
        <img
          alt=""
          src={`data:image/svg+xml;charset=utf-8,${ANIMATED_BLOB_SVG}`}
          style={{
            height: '100%',
            objectFit: 'cover',
            width: '100%',
          }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-between px-1.5 pb-1.5 pt-2"
          style={{
            background:
              'linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.88) 100%)',
          }}
        >
          <div className="px-1 pt-1">
            <Bars
              items={[
                { color: '#8ecae6', maxValue: 100, title: 'low', value: 72 },
                { color: '#cdb4db', maxValue: 100, title: 'mid', value: 48 },
                { color: '#adb5bd', maxValue: 100, title: 'high', value: 21 },
              ]}
            />
          </div>
          <Text fit="wrap">{config.label}</Text>
        </div>
      </div>
    </ButtonSurface>
  ),
  type: 'media-sample',
})

export { builtinMediaSampleButton, BuiltinMediaSampleButtonSchema }
