import { EventEmitter } from 'node:events';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Logger } from 'pino';
import {
  parseMessage,
  serializeMessage,
  type Message,
} from './protocol.js';

export interface WsBridgeHandle extends EventEmitter {
  port: number;
  url: string;
  send(msg: Message): boolean;
  broadcast(msg: Message): number;
  onMessage(handler: (msg: Message) => void): () => void;
  onConnection(handler: (connected: boolean, clientCount: number) => void): () => void;
  close(): Promise<void>;
}

export interface CreateWsBridgeOptions {
  logger: Logger;
  port?: number;
  host?: string;
}

// Stable default port for the WS bridge so that hot-reload via
// `tsx watch` doesn't reassign a new ephemeral port on every restart
// (which would invalidate the page URL the browser is currently open
// to). Override via opts.port or SIRENO_WS_PORT env var.
const DEFAULT_WS_PORT = 52937;

export function createWsBridge(
  opts: CreateWsBridgeOptions,
): Promise<WsBridgeHandle> {
  const logger = opts.logger.child({ module: 'ws-bridge' });
  const host = opts.host ?? '127.0.0.1';
  const portFromEnv = process.env.SIRENO_WS_PORT
    ? Number(process.env.SIRENO_WS_PORT)
    : undefined;
  const requestedPort =
    opts.port ?? portFromEnv ?? DEFAULT_WS_PORT;

  const handle = new EventEmitter() as WsBridgeHandle;
  handle.port = 0;
  handle.url = '';

  const clients = new Set<WebSocket>();
  const messageHandlers = new Set<(msg: Message) => void>();
  const connectionHandlers = new Set<
    (connected: boolean, clientCount: number) => void
  >();

  const server = new WebSocketServer({ port: requestedPort, host });
  const ready = new Promise<void>((resolve) => server.once('listening', () => resolve()));

  server.on('connection', (ws) => {
    clients.add(ws);
    logger.info({ clients: clients.size }, 'renderer connected');
    connectionHandlers.forEach((h) => h(true, clients.size));
    handle.emit('connection', true, clients.size);

    ws.on('message', (data) => {
      try {
        const text =
          typeof data === 'string'
            ? data
            : Buffer.isBuffer(data)
              ? data.toString('utf8')
              : new TextDecoder().decode(data as ArrayBuffer);
        const msg = parseMessage(text);
        messageHandlers.forEach((h) => h(msg));
        handle.emit('message', msg);
      } catch (err) {
        logger.warn({ err }, 'failed to parse incoming WS message; dropping');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info({ clients: clients.size }, 'renderer disconnected');
      connectionHandlers.forEach((h) => h(false, clients.size));
      handle.emit('connection', false, clients.size);
    });

    ws.on('error', (err) => {
      logger.warn({ err }, 'ws client error');
    });
  });

  handle.send = (msg: Message): boolean => {
    const first = clients.values().next().value as WebSocket | undefined;
    if (!first || first.readyState !== first.OPEN) return false;
    first.send(serializeMessage(msg));
    return true;
  };

  handle.broadcast = (msg: Message): number => {
    const text = serializeMessage(msg);
    let count = 0;
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(text);
        count++;
      }
    }
    return count;
  };

  handle.onMessage = (handler) => {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  };

  handle.onConnection = (handler) => {
    connectionHandlers.add(handler);
    return () => connectionHandlers.delete(handler);
  };

  handle.close = async () => {
    for (const ws of clients) {
      try {
        ws.close();
      } catch {}
    }
    clients.clear();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return ready.then(() => {
    const addr = server.address();
    if (addr && typeof addr === 'object') {
      handle.port = addr.port;
      handle.url = `ws://${host}:${addr.port}`;
      logger.info({ url: handle.url }, 'WS bridge ready');
    }
    return handle;
  });
}