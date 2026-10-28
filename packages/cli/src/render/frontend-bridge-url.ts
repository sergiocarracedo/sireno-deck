/**
 * Chooses the endpoint embedded in Vite-served frontend clients. The service
 * bridge keeps listening at its own URL; SIRENO_WS_PROXY_URL only redirects
 * frontend clients through a local capture/debugging proxy.
 */
export const frontendBridgeUrl = (
  environment: NodeJS.ProcessEnv = process.env,
  fallback = "ws://127.0.0.1:52937",
): string =>
  environment["SIRENO_WS_PROXY_URL"] ?? environment["SIRENO_WS_URL"] ?? fallback
