import { readFile } from "node:fs/promises"
import { isIP } from "node:net"
import { ensureRemoteCertificates } from "@/system/remote-certificates"
import { startRemoteGateway } from "./remote-gateway"

export async function startRemoteSurfaces(options: {
  root: string
  addresses: readonly string[]
  host?: string
  frontendPort: number
  configPort: number
  bridgePort: number
  token: string
}) {
  const addresses = [
    ...new Set(options.addresses.filter((value) => isIP(value) === 4)),
  ]
  if (!addresses.length)
    throw new Error("No usable IPv4 address for secure remote access")
  const certificate = await ensureRemoteCertificates(options.root, addresses)
  const [key, cert] = await Promise.all([
    readFile(certificate.keyPath),
    readFile(certificate.certPath),
  ])
  const origins = new Set(["https://invalid.invalid"])
  const sessions = new Set<string>()
  const common = {
    host: options.host ?? "0.0.0.0",
    port: 0,
    bridgePort: options.bridgePort,
    token: options.token,
    key,
    cert,
    allowedOrigins: origins,
    sessions,
  }
  const frontend = await startRemoteGateway({
    ...common,
    targetPort: options.frontendPort,
  })
  try {
    const config = await startRemoteGateway({
      ...common,
      targetPort: options.configPort,
    })
    for (const address of [...addresses, "127.0.0.1", "localhost"]) {
      origins.add(`https://${address}:${frontend.port}`)
      origins.add(`https://${address}:${config.port}`)
    }
    origins.delete("https://invalid.invalid")
    return {
      frontendUrl: `https://${addresses[0]}:${frontend.port}/`,
      configUrl: `https://${addresses[0]}:${config.port}/`,
      frontendPort: frontend.port,
      caPath: certificate.caPath,
      fingerprint: certificate.fingerprint,
      async close() {
        await Promise.all([frontend.close(), config.close()])
      },
    }
  } catch (error) {
    await frontend.close()
    throw error
  }
}
