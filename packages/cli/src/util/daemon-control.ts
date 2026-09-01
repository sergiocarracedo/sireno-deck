import { connect, createServer, type Server } from "node:net"

import { existsSync, unlinkSync } from "node:fs"

import type pino from "pino"

import type { DaemonPaths } from "./daemon"

const GET_TOKEN = "get-token\n"

export const startDaemonControl = (
  token: string,
  paths: DaemonPaths,
  logger: pino.Logger,
): Promise<Server> =>
  new Promise((resolve, reject) => {
    if (existsSync(paths.controlSocket)) unlinkSync(paths.controlSocket)
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
