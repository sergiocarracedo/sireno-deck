export const WS_BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;

export const WS_MAX_ATTEMPTS = 10;

export const computeNextBackoff = (attempt: number): number => {
  if (attempt < 0) return WS_BACKOFF_DELAYS_MS[0]!;
  if (attempt >= WS_BACKOFF_DELAYS_MS.length)
    return WS_BACKOFF_DELAYS_MS[WS_BACKOFF_DELAYS_MS.length - 1]!;
  return WS_BACKOFF_DELAYS_MS[attempt]!;
};

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener?(name: string, cb: (event: unknown) => void): void;
  removeEventListener?(name: string, cb: (event: unknown) => void): void;
}

export interface WsClientOptions {
  readonly url: string;
  readonly token?: string;
  readonly onOpen?: () => void;
  readonly onMessage?: (data: unknown) => void;
  readonly onClose?: () => void;
  readonly onFailed?: () => void;
  readonly wsFactory?: (url: string) => WebSocketLike;
}

export type WsStatus = "connecting" | "open" | "closed" | "failed";

export interface WsClient {
  send(data: string): void;
  close(): void;
  status(): WsStatus;
  attemptCount(): number;
}

export const createWsClient = (options: WsClientOptions): WsClient => {
  let status: WsStatus = "connecting";
  let attempts = 0;
  let ws: WebSocketLike | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByUser = false;
  let openListener: ((event: unknown) => void) | null = null;
  let closeListener: ((event: unknown) => void) | null = null;
  const messageListeners: Array<(event: unknown) => void> = [];

  const setStatus = (next: WsStatus): void => {
    status = next;
  };

  const scheduleReconnect = (): void => {
    if (closedByUser) return;
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    const delay = computeNextBackoff(Math.max(0, attempts - 1));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const onWsOpen = (event: unknown): void => {
    setStatus("open");
    options.onOpen?.();
    void event;
  };

  const onWsClose = (event: unknown): void => {
    setStatus("closed");
    options.onClose?.();
    scheduleReconnect();
    void event;
  };

  const onWsMessage = (event: unknown): void => {
    const data =
      event instanceof MessageEvent
        ? event.data
        : (event as { data?: unknown })?.data ?? event;
    options.onMessage?.(data);
  };

  const open = (): void => {
    if (closedByUser) return;
    if (attempts >= WS_MAX_ATTEMPTS) {
      setStatus("failed");
      options.onFailed?.();
      return;
    }
    attempts += 1;
    const factory =
      options.wsFactory ?? ((url: string) => new WebSocket(url) as unknown as WebSocketLike);
    const created = factory(options.url);
    if (created === null || created === undefined) {
      setStatus("failed");
      options.onFailed?.();
      return;
    }
    ws = created;
    setStatus("connecting");
    if (typeof created.addEventListener === "function") {
      openListener = onWsOpen;
      closeListener = onWsClose;
      const messageListener = onWsMessage;
      created.addEventListener("open", openListener);
      created.addEventListener("close", closeListener);
      created.addEventListener("message", messageListener);
      messageListeners.push(messageListener);
    }
  };

  void open();

  return {
    send(data) {
      if (ws !== null && status === "open") ws.send(data);
    },
    close() {
      closedByUser = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws !== null && typeof ws.removeEventListener === "function") {
        if (openListener !== null) ws.removeEventListener("open", openListener);
        if (closeListener !== null) ws.removeEventListener("close", closeListener);
        for (const ml of messageListeners) ws.removeEventListener("message", ml);
      }
      ws?.close();
      setStatus("closed");
    },
    status: () => status,
    attemptCount: () => attempts,
  };
};

export const serializeHello = (token?: string): string => {
  return JSON.stringify({ type: "hello", version: 3, ...(token !== undefined ? { token } : {}) });
};
