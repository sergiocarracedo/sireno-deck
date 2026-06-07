import { ConfigValidationError } from "@/core/schemas"

const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

export type RuntimeButtonErrorKind = "dbl-tap" | "hold" | "invalidate" | "press" | "refresh" | "release" | "render" | "tap"

export interface RuntimeButtonErrorLogContext {
  buttonPosition: number
  buttonType: string
  deckId: string
  errorCode: string
  operation: RuntimeButtonErrorKind
}

const RUNTIME_BUTTON_ERROR_CODES: Record<RuntimeButtonErrorKind, string> = {
  "dbl-tap": "4107",
  hold: "4108",
  invalidate: "4102",
  press: "4103",
  refresh: "4106",
  release: "4104",
  render: "4101",
  tap: "4105",
}

export function formatConfigError(error: ConfigValidationError): string {
  let message = `\n${BOLD}${RED}config error${RESET}\n\n`

  if (error.filePath) {
    message += `  ${CYAN}file:${RESET} ${error.filePath}\n`
  }

  if (error.lineNumber !== undefined) {
    message += `  ${CYAN}line:${RESET} ${error.lineNumber}\n`
  }

  message += `  ${YELLOW}problem:${RESET} ${error.message}\n`

  if (error.suggestion) {
    message += `  ${CYAN}suggestion:${RESET} ${error.suggestion}\n`
  }

  message += `\n  Tip: Check your config.yml at ${error.filePath || "the config file"}.\n`

  return message
}

export function createRuntimeButtonErrorLogEntry(
  context: RuntimeButtonErrorLogContext,
  error: unknown,
): RuntimeButtonErrorLogContext & { error: unknown; scope: "button-runtime" } {
  return {
    ...context,
    error,
    scope: "button-runtime",
  }
}

export function getRuntimeButtonErrorCode(operation: RuntimeButtonErrorKind): string {
  return RUNTIME_BUTTON_ERROR_CODES[operation]
}
