import { z } from 'zod'

import type { AddonButtonTypeBackend } from '@/addon/api'

import { buildMacOSCommand, formatCommand, isMacOS } from '../../domain/macos'

export const BrightnessButtonSchema = z
  .object({
    action: z.enum(['up', 'down', 'set']).optional().default('up'),
    value: z.number().int().min(0).max(100).optional(),
  })
  .strict()

export type BrightnessButtonConfig = z.infer<typeof BrightnessButtonSchema>

export const brightnessButtonBackend: AddonButtonTypeBackend = {
  configSchema: BrightnessButtonSchema,
  defaultRenderIntervalMs: 2000,
  onTap: ({ config, hostContext, buttonId: _buttonId }) => {
    void _buttonId
    const platform = (globalThis as { process?: { platform?: string } }).process
      ?.platform as NodeJS.Platform | undefined
    if (platform === undefined || !isMacOS(platform)) return
    const cfg = config as BrightnessButtonConfig
    const cmd = buildMacOSCommand(cfg)
    const exec = hostContext['exec'] as
      | ((
          cmd: string,
          args: string[],
        ) => Promise<{ exitCode: number; stderr: string }>)
      | undefined
    if (!exec) return
    void exec(cmd[0]!, cmd.slice(1)).catch((err: unknown) => {
      const error = err as { message?: string }
      void error
      void formatCommand(cmd)
    })
  },
}
