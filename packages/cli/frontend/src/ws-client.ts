import {
  PROTOCOL_VERSION,
  type Message,
  DeckConfigMessageSchema,
  StateMessageSchema,
  ButtonConfigMessageSchema,
  SnapshotMessageSchema,
  MethodCallResultMessageSchema,
} from '../../src/render/protocol';

export type WsConnectionState = 'connecting' | 'open' | 'closed';

export interface WsClient {
  send(msg: Message): void;
  onMessage(handler: (msg: Message) => void): () => void;
  onConnection(handler: (state: WsConnectionState) => void): () => void;
  close(): void;
}

function parseIncoming(raw: string): Message | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.protocolVersion !== PROTOCOL_VERSION) return null;
  const t = obj.type;
  switch (t) {
    case 'deck-config':
      return DeckConfigMessageSchema.safeParse(obj).success
        ? (parsed as Message)
        : null;
    case 'state':
      return StateMessageSchema.safeParse(obj).success
        ? (parsed as Message)
        : null;
    case 'button-config':
      return ButtonConfigMessageSchema.safeParse(obj).success
        ? (parsed as Message)
        : null;
    case 'snapshot':
      return SnapshotMessageSchema.safeParse(obj).success
        ? (parsed as Message)
        : null;
    case 'method-call-result':
      return MethodCallResultMessageSchema.safeParse(obj).success
        ? (parsed as Message)
        : null;
    default:
      return null;
  }
}

export function openWsClient(opts: {
  url: string;
  reconnectMs?: number;
}): WsClient {
  const reconnectMs = opts.reconnectMs ?? 1000;
  const messageHandlers = new Set<(msg: Message) => void>();
  const connectionHandlers = new Set<(state: WsConnectionState) => void>();
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const fireConnection = (state: WsConnectionState) => {
    for (const h of connectionHandlers) h(state);
  };

  const fireMessage = (msg: Message) => {
    for (const h of messageHandlers) h(msg);
  };

  const connect = () => {
    if (closed) return;
    fireConnection('connecting');
    ws = new WebSocket(opts.url);
    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      fireConnection('open');
    };
    ws.onmessage = (ev) => {
      const msg = parseIncoming(String(ev.data));
      if (msg) fireMessage(msg);
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      fireConnection('closed');
      if (closed) return;
      reconnectTimer = setTimeout(connect, reconnectMs);
    };
  };

  connect();

  return {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    onMessage(handler) {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
    onConnection(handler) {
      connectionHandlers.add(handler);
      return () => connectionHandlers.delete(handler);
    },
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}

export function readWsUrlFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ws');
}