import { networkInterfaces, type NetworkInterfaceInfo } from "node:os"

export interface LanAddress {
  readonly address: string
  readonly interfaceName: string
}

export interface NetworkInterfacesMap {
  readonly [interfaceName: string]:
    | ReadonlyArray<NetworkInterfaceInfo>
    | undefined
}

export interface SelectLanAddressesOptions {
  readonly interfaces?: NetworkInterfacesMap
  readonly networkInterfaces?: typeof networkInterfaces
}

export const TUNNEL_INTERFACE_PATTERN = /^(utun|tun|tap|vpn|tailscale|wg)/i
export const PHYSICAL_ETHERNET_PATTERN = /^en/i
export const PHYSICAL_LINUX_ETHERNET_PATTERN = /^eth/i
export const NON_TUNNEL_WIRELESS_PATTERN = /^wlan/i

const LAN_INTERFACE_PRIORITY: ReadonlyArray<{
  readonly pattern: RegExp
  readonly score: number
}> = [
  { pattern: PHYSICAL_ETHERNET_PATTERN, score: 0 },
  { pattern: PHYSICAL_LINUX_ETHERNET_PATTERN, score: 0 },
  { pattern: NON_TUNNEL_WIRELESS_PATTERN, score: 1 },
  { pattern: TUNNEL_INTERFACE_PATTERN, score: 3 },
]

const computePriority = (interfaceName: string): number => {
  for (const { pattern, score } of LAN_INTERFACE_PRIORITY) {
    if (pattern.test(interfaceName)) return score
  }
  return 2
}

const isValidIPv4LanAddress = (info: NetworkInterfaceInfo): boolean => {
  if (info.family !== "IPv4") return false
  if (info.internal) return false
  if (info.address.startsWith("127.")) return false
  if (info.address.startsWith("169.254.")) return false
  return true
}

export const selectLanAddresses = (
  options: SelectLanAddressesOptions = {},
): ReadonlyArray<LanAddress> => {
  const fetchInterfaces = options.networkInterfaces ?? networkInterfaces
  const interfaces =
    options.interfaces ?? (fetchInterfaces() as unknown as NetworkInterfacesMap)

  const candidates: LanAddress[] = []
  for (const interfaceName of Object.keys(interfaces)) {
    const list = interfaces[interfaceName]
    if (list === undefined) continue
    const first = list[0]
    if (first === undefined) continue
    if (!isValidIPv4LanAddress(first)) continue
    candidates.push({ address: first.address, interfaceName })
  }

  return candidates.sort(
    (a, b) =>
      computePriority(a.interfaceName) - computePriority(b.interfaceName),
  )
}

export interface PrintEmulatorBannerOptions {
  readonly emulatorUrlFn: (lanAddress: string) => string
  readonly lanAddresses: ReadonlyArray<LanAddress>
  readonly securityWarning: string
  readonly output: (text: string) => void
  readonly qrGenerate?: (text: string) => string | Promise<string>
}

const formatInterfaceLabel = (name: string): string => name

export async function printEmulatorBanner(
  options: PrintEmulatorBannerOptions,
): Promise<void> {
  const { emulatorUrlFn, lanAddresses, securityWarning, output, qrGenerate } =
    options

  if (lanAddresses.length === 0) {
    output("\n  Emulator:  http://127.0.0.1:52938\n")
    output(
      "\x1b[33m  warning: no LAN interfaces detected — QR may not reach your phone.\x1b[0m\n\n",
    )
    output(`\x1b[33m  ${securityWarning}\x1b[0m\n\n`)
    return
  }

  output("\n  Emulator (LAN):\n")
  for (const entry of lanAddresses) {
    const url = emulatorUrlFn(entry.address)
    if (qrGenerate !== undefined) {
      output("\n")
      const qr = await qrGenerate(url)
      output(qr)
      output(`  ${url}  ← ${formatInterfaceLabel(entry.interfaceName)}\n`)
    } else {
      output(`  ${url}  ← ${formatInterfaceLabel(entry.interfaceName)}\n`)
    }
  }
  output("\n")
  output(`\x1b[33m  ${securityWarning}\x1b[0m\n\n`)
}
