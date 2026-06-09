import { KeyMacroParseError } from './parser'
import type {
  KeyMacroExecutor,
  KeyMacroProvider,
  KeyMacroProviderDeps,
  KeyMacroStep,
} from './provider'

const XDOTOOL_MODIFIER_MAP: Record<string, string> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  shift: 'shift',
  meta: 'super',
  cmd: 'super',
  command: 'super',
  super: 'super',
  win: 'super',
}

const XDOTOOL_KEY_ALIASES: Record<string, string> = {
  escape: 'Escape',
  esc: 'Escape',
  enter: 'Return',
  return: 'Return',
  tab: 'Tab',
  backspace: 'BackSpace',
  delete: 'Delete',
  space: 'space',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
}

function renderXdotoolKey(step: Extract<KeyMacroStep, { type: 'key' }>): string {
  const unknown = step.modifiers.find((m) => !(m in XDOTOOL_MODIFIER_MAP))
  if (unknown) {
    throw new KeyMacroParseError(
      `Unsupported modifier '${unknown}' for Linux key-macro`,
      unknown,
    )
  }
  const mappedModifiers = step.modifiers.map((m) => XDOTOOL_MODIFIER_MAP[m] as string)
  const keyName = XDOTOOL_KEY_ALIASES[step.key.toLowerCase()] ?? step.key
  const parts = [...mappedModifiers, keyName]
  return parts.join('+')
}

export interface CreateLinuxProviderOptions extends KeyMacroProviderDeps {
  executor: KeyMacroExecutor
}

export function createLinuxKeyMacroProvider(
  options: CreateLinuxProviderOptions,
): KeyMacroProvider {
  return {
    supportsKeyMacro: true,
    async send(sequence) {
      const args: string[] = ['xdotool', 'key', '--clearmodifiers']
      for (const step of sequence) {
        if (step.type === 'wait') {
          if (args.length > 3) {
            await runCommand(options.executor, args)
            args.length = 3
          }
          await runCommand(options.executor, [
            'sleep',
            (step.delayMs / 1000).toFixed(3),
          ])
          continue
        }
        args.push(renderXdotoolKey(step))
      }
      if (args.length > 3) {
        await runCommand(options.executor, args)
      }
    },
  }
}

async function runCommand(
  executor: KeyMacroExecutor,
  args: readonly string[],
): Promise<void> {
  if (args.length === 0) return
  const program = args
    .map((arg) => (/\s/.test(arg) ? `'${arg.replaceAll("'", "'\"'\"'")}'` : arg))
    .join(' ')
  const result = await executor.run(program)
  if (result.failed) {
    // Non-fatal: keep macro playing through unless the program is missing.
  }
}
