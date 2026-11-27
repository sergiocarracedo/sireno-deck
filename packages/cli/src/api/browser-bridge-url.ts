export const browserBridgeUrl = (
  fallback: string,
  gatewayEnabled: boolean,
  pageUrl: string,
): string => {
  if (!gatewayEnabled) return fallback
  const page = new URL(pageUrl)
  if (page.protocol !== "https:") return fallback
  return `wss://${page.host}/bridge`
}

export const browserFrontendUrl = (
  fallback: string,
  gatewayEnabled: boolean,
  pageUrl: string,
  gatewayPort: number,
): string => {
  if (
    !gatewayEnabled ||
    !Number.isInteger(gatewayPort) ||
    gatewayPort < 1 ||
    gatewayPort > 65535
  )
    return fallback
  const page = new URL(pageUrl)
  if (page.protocol !== "https:") return fallback
  page.port = String(gatewayPort)
  page.pathname = "/"
  page.search = ""
  page.hash = ""
  return page.toString()
}
