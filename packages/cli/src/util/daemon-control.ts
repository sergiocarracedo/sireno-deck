import { connect, createServer, type Server } from "node:net"

import { existsSync, unlinkSync } from "node:fs"

import type pino from "pino"

import type { DaemonPaths } from "./daemon"
import { isSocketLive } from "./single-instance"

const GET_TOKEN = "get-token\n"

/**
 * ponytail: the stale-socket clear used to be unconditional, which quietly took
 * the socket away from a daemon that was still serving it — the second daemon
 * got a working control socket while the first was left owning a path that no
 * longer referred to its listener. Whether a path is free is the kernel's to
 * say, so ask it: only a socket nothing answers on is cleared, and a genuine
 * EADDRINUSE surfaces as a rejection instead of being worked around.
 */
export const startDaemonControl = async (
  token: string,
  paths: DaemonPaths,
  logger: pino.Logger,
): Promise<Server> => {
  if (
    existsSync(paths.controlSocket) &&
    !(await isSocketLive(paths.controlSocket))
  ) {
    unlinkSync(paths.controlSocket)
  }
  return new Promise((resolve, reject) => {
    const server = createServer((socket) => {
      socket.setEncoding("utf8")
      socket.on("data", (data) => {
        if (String(data).trim() === "get-token") socket.end(`${token}\n`)
        else socket.destroy()
      })
    })
    server.once("error", reject)
    server.listen(paths.controlSocket, () => {
      server.off("error", reject)
      logger.debug("daemon control socket started")
      resolve(server)
    })
  })
}

export const requestDaemonToken = (
  paths: DaemonPaths,
  timeoutMs = 1_000,
): Promise<string | null> =>
  new Promise((resolve) => {
    if (!existsSync(paths.controlSocket)) {
      resolve(null)
      return
    }
    const socket = connect(paths.controlSocket)
    let data = ""
    let settled = false
    const finish = (token: string | null): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(token)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    socket.setEncoding("utf8")
    socket.on("data", (chunk) => {
      data += chunk
      if (data.includes("\n")) {
        clearTimeout(timer)
        const token = data.split("\n", 1)[0]?.trim() ?? ""
        finish(token.length > 0 ? token : null)
      }
    })
    socket.on("error", () => {
      clearTimeout(timer)
      finish(null)
    })
    socket.on("connect", () => socket.write(GET_TOKEN))
  })

export const removeDaemonControl = (paths: DaemonPaths): void => {
  if (existsSync(paths.controlSocket)) unlinkSync(paths.controlSocket)
}
