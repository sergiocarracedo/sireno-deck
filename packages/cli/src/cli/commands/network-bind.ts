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

export const PHYSICAL_ETHERNET_PATTERN = /^en/i
export const PHYSICAL_LINUX_ETHERNET_PATTERN = /^eth/i
export const NON_TUNNEL_WIRELESS_PATTERN = /^wlan/i
export const VIRTUAL_INTERFACE_PATTERN =
  /^(?:docker\d*|br-|bridge\d*|veth|virbr|vmnet|vboxnet|tailscale|utun|tun\d*|tap\d*|wg\d*|zt\w*|cni\d*|flannel|podman|lxcbr|vEthernet|loopback|awdl\d*|llw\d*|anpi\d*|gif\d*|stf\d*)/i

const LAN_INTERFACE_PRIORITY: ReadonlyArray<{
  readonly pattern: RegExp
  readonly score: number
}> = [
  { pattern: PHYSICAL_ETHERNET_PATTERN, score: 0 },
  { pattern: PHYSICAL_LINUX_ETHERNET_PATTERN, score: 0 },
  { pattern: /^wlp/i, score: 1 },
  { pattern: NON_TUNNEL_WIRELESS_PATTERN, score: 1 },
  { pattern: /^wi[- ]?fi$/i, score: 1 },
  { pattern: /^ethernet/i, score: 0 },
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
    if (VIRTUAL_INTERFACE_PATTERN.test(interfaceName)) continue
    const list = interfaces[interfaceName]
    if (list === undefined) continue
    const address = list.find(isValidIPv4LanAddress)
    if (address === undefined) continue
    candidates.push({ address: address.address, interfaceName })
  }

  const selected = candidates.sort(
    (a, b) =>
      computePriority(a.interfaceName) - computePriority(b.interfaceName),
  )[0]
  return selected === undefined ? [] : [selected]
}

export interface PrintConfigUiBannerOptions {
  readonly configUiUrlFn: (lanAddress: string) => string
  readonly lanAddresses: ReadonlyArray<LanAddress>
  readonly securityWarning: string
  readonly output: (text: string) => void
  readonly qrGenerate?: (text: string) => string | Promise<string>
}

const formatInterfaceLabel = (name: string): string => name

export async function printConfigUiBanner(
  options: PrintConfigUiBannerOptions,
): Promise<void> {
  const { configUiUrlFn, lanAddresses, securityWarning, output, qrGenerate } =
    options

  if (lanAddresses.length === 0) {
    output("\n  Config UI:  http://127.0.0.1:52938\n")
    output(
      "\x1b[33m  warning: no LAN interfaces detected — QR may not reach your phone.\x1b[0m\n\n",
    )
    output(`\x1b[33m  ${securityWarning}\x1b[0m\n\n`)
    return
  }

  output("\n  Config UI (LAN):\n")
  for (const entry of lanAddresses.slice(0, 1)) {
    const url = configUiUrlFn(entry.address)
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
