import type pino from "pino"

import { ProviderError } from "./error"

export interface CommandExecutor {
  run(
    command: string,
    args: ReadonlyArray<string>,
    options?: { timeoutMs?: number },
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>
}

export interface LinuxDbusBus {
  getProxyObject(
    serviceName: string,
    objectPath: string,
  ): Promise<LinuxDbusProxyObject>
  disconnect?(): void
}

export interface LinuxDbusProxyObject {
  getInterface(name: string): LinuxDbusInterface
}

export interface LinuxDbusInterface {
  Eval?(script: string): Promise<unknown>
  GetActive?(): Promise<boolean>
  GetIdletime?(): Promise<number>
  FocusClass?(): Promise<string>
  on?(event: string, handler: (...args: unknown[]) => void): void
  off?(event: string, handler: (...args: unknown[]) => void): void
}

export const withTimeout = async <T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderError("TIMEOUT", `Operation timed out after ${ms}ms`))
    }, ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

export const noopUnsubscribe = (): void => undefined

export const logNull = (
  logger: pino.Logger | undefined,
  name: string,
  reason: string,
): void => {
  if (logger) {
    logger.warn(
      { provider: name, reason },
      "OS provider unavailable, using null provider",
    )
  }
}
