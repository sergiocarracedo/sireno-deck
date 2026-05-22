import { createElement } from 'react'
import { z } from 'zod'

import { createDomButtonRender } from '../../../addon/api.js'

const MEDIA_DEMO_REFRESH_INTERVAL_MS = 125

const MediaDemoFrameSchema = z.object({
  accent: z.string().min(1),
  label: z.string().min(1),
}).strict()

const BuiltinMediaDemoButtonSchema = z.object({
  frames: z.array(MediaDemoFrameSchema).min(1).default([
    { accent: '#7dd3fc', label: 'SKY' },
    { accent: '#34d399', label: 'MINT' },
    { accent: '#f472b6', label: 'ROSE' },
  ]),
  label: z.string().min(1).default('Media Sample'),
  loop: z.boolean().default(true),
  sample_interval_ms: z.number().int().min(100).max(5_000).default(500),
}).strict()

function createMediaDemoContent(options: {
  accent: string
  frameLabel: string
  label: string
}) {
  return createElement('div', {
    'data-sireno-media-demo': options.frameLabel,
    style: {
      alignItems: 'stretch',
      background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${options.accent} 78%, #ffffff), color-mix(in srgb, ${options.accent} 35%, #0f172a) 58%, #020617 100%)`,
      borderRadius: '14px',
      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${options.accent} 34%, transparent), 0 12px 28px color-mix(in srgb, ${options.accent} 26%, transparent)`,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      justifyContent: 'space-between',
      minHeight: '56px',
      padding: '10px',
      width: '100%',
    },
  },
  createElement('div', {
    style: {
      color: '#e2e8f0',
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.16em',
      lineHeight: 1,
      opacity: 0.72,
      textTransform: 'uppercase',
    },
  }, options.label),
  createElement('div', {
    style: {
      color: '#f8fafc',
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '16px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      lineHeight: 1,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  }, options.frameLabel))
}

const builtinMediaDemoButton = {
  configSchema: BuiltinMediaDemoButtonSchema,
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinMediaDemoButtonSchema>
  }) => {
    let frameIndex = 0

    return {
      defaultIntervalMs: MEDIA_DEMO_REFRESH_INTERVAL_MS,
      refresh: async () => {
        if (config.frames.length <= 1) {
          return
        }

        if (!config.loop && frameIndex >= config.frames.length - 1) {
          return
        }

        frameIndex = config.loop ? (frameIndex + 1) % config.frames.length : Math.min(frameIndex + 1, config.frames.length - 1)
      },
      render: () => {
        const frame = config.frames[frameIndex] ?? config.frames[0]

        return createDomButtonRender({
          content: createMediaDemoContent({
            accent: frame?.accent ?? '#7dd3fc',
            frameLabel: frame?.label ?? 'FRAME',
            label: config.label,
          }),
          fallback: {
            detailLines: [frame?.label ?? 'FRAME'],
            label: config.label,
            subtitle: config.loop ? 'LOOP' : 'HOLD',
            variant: 'media',
          },
          keyIndex: button.position,
          sample_interval_ms: config.sample_interval_ms,
        })
      },
    }
  },
  type: 'media-demo',
}

export { builtinMediaDemoButton, BuiltinMediaDemoButtonSchema, MEDIA_DEMO_REFRESH_INTERVAL_MS }
