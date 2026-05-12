import { ConfigValidationError } from "../core/schemas.js"

const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const CYAN = "\x1b[36m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

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
