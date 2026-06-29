import { ChannelRegistry } from "sireno-deck-2/react";
import { helloMessageSchema, wsMessageSchema, type WsMessage } from "@/api/protocol";

export type ConnectionStatus = "connecting" | "open" | "closed" | "failed";

export interface WsClientOptions {
  url: string;
  token?: string;
  protocolVersion?: number;
  onMessage?: (message: WsMessage) => void;
  onStatus?: (status: ConnectionStatus) => void;
  backoffMs?: ReadonlyArray<number>;
  maxAttempts?: number;
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];
const DEFAULT_MAX_ATTEMPTS = 10;

export interface WsClient {
  connect(): void;
  close(): void;
  send(message: WsMessage): void;
}

export const createWsClient = (options: WsClientOptions): WsClient => {
  const {
    url,
    token,
    protocolVersion = 3,
    onMessage,
    onStatus,
    backoffMs = DEFAULT_BACKOFF,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options;

  let socket: WebSocket | null = null;
  let attempt = 0;
  let manuallyClosed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (status: ConnectionStatus): void => onStatus?.(status);

  const scheduleReconnect = (): void => {
    if (manuallyClosed) return;
    if (attempt >= maxAttempts) {
      setStatus("failed");
      return;
    }
    const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)] ?? 30000;
    attempt += 1;
    timer = setTimeout(connect, delay);
  };

  const connect = (): void => {
    if (manuallyClosed) return;
    setStatus("connecting");
    socket = new WebSocket(url);
    socket.addEventListener("open", () => {
      attempt = 0;
      setStatus("open");
      const hello = helloMessageSchema.parse({
        type: "hello",
        version: protocolVersion,
        ...(token !== undefined ? { token } : {}),
      });
      socket?.send(JSON.stringify(hello));
    });
    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        const parsed = wsMessageSchema.safeParse(JSON.parse(String(event.data)));
        if (parsed.success) {
          onMessage?.(parsed.data);
          if (parsed.data.type === "state") {
            for (const [channel, payload] of Object.entries(parsed.data.channels)) {
              ChannelRegistry.instance().publish(channel, payload);
            }
          }
        }
      } catch {
        // ignore invalid frames
      }
    });
    socket.addEventListener("close", () => {
      setStatus("closed");
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      socket?.close();
    });
  };

  const close = (): void => {
    manuallyClosed = true;
    if (timer !== null) clearTimeout(timer);
    if (socket === null) return;
    if (socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };

  const send = (message: WsMessage): void => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  return { connect, close, send };
};
