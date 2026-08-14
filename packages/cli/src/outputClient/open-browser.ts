import { execFile } from "node:child_process"
import { platform } from "node:os"

import type pino from "pino"

export const openBrowser = (
  url: string,
  logger: pino.Logger,
  noOpen = false,
): void => {
  if (noOpen) {
    logger.info("browser auto-open disabled")
    return
  }
  const os = platform()
  const cmd = os === "win32" ? "cmd" : os === "darwin" ? "open" : "xdg-open"
  const args = os === "win32" ? ["/c", "start", "", url] : [url]
  execFile(cmd, args, (err) => {
    if (err !== null) {
      logger.warn(
        { err: err.message },
        "browser auto-open unavailable, open the URL manually",
      )
    }
  })
}
