export interface LoggerLike {
  warn: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

export type KeyMacroStep =
  | { type: 'key'; key: string; modifiers: readonly string[] }
  | { type: 'wait'; delayMs: number }

export interface KeyMacroProvider {
  readonly supportsKeyMacro: boolean
  send(sequence: readonly KeyMacroStep[]): Promise<void>
}

export interface KeyMacroProviderDeps {
  logger: LoggerLike
}

export interface KeyMacroExecutor {
  run: (program: string) => Promise<{ code: number | null; failed: boolean }>
}

export function createExecaKeyMacroExecutor(
  exec: (program: string, args: string[]) => Promise<{ code: number | null; failed: boolean }>,
): KeyMacroExecutor {
  return {
    run: async (program) => exec('/bin/sh', ['-c', program]),
  }
}
