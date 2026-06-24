import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import {
  helloAckMessageSchema,
  helloMessageSchema,
  wsMessageSchema,
  type WsMessage,
} from "./protocol.ts";

const HANDSHAKE_TIMEOUT_MS = 5000;
const TOKEN_MISMATCH_CLOSE_CODE = 4001;

export interface WsBridgeOptions {
  expectedToken?: string;
  handshakeTimeoutMs?: number;
  activeTheme?: { name: string; version?: number };
}

export interface WsBridge {
  readonly port: number;
  readonly url: string;
  broadcast(message: WsMessage): void;
  sendToCaller(message: WsMessage): void;
  onMessage(handler: (message: WsMessage, socket: WebSocket) => void): void;
  onConnection(handler: (socket: WebSocket) => void): void;
  close(): Promise<void>;
}

export const startWsBridge = (options: WsBridgeOptions = {}): Promise<WsBridge> => {
  const { expectedToken, handshakeTimeoutMs = HANDSHAKE_TIMEOUT_MS, activeTheme } = options;

  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });

    const messageHandlers: Array<(message: WsMessage, socket: WebSocket) => void> = [];
    const connectionHandlers: Array<(socket: WebSocket) => void> = [];

    wss.on("connection", (socket: WebSocket) => {
      let handshakeDone = false;

      const handshakeTimer = setTimeout(() => {
        if (!handshakeDone) socket.close(4000, "handshake timeout");
      }, handshakeTimeoutMs);

      socket.on("message", (raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          socket.close(4002, "invalid json");
          return;
        }
        const result = wsMessageSchema.safeParse(parsed);
        if (!result.success) {
          socket.close(4003, "invalid message");
          return;
        }
        const message = result.data;
        if (!handshakeDone) {
          if (message.type !== "hello") {
            socket.close(4004, "expected hello");
            return;
          }
          const helloResult = helloMessageSchema.safeParse(message);
          if (!helloResult.success) {
            socket.close(4001, "invalid hello");
            return;
          }
          if (expectedToken !== undefined && helloResult.data.token !== expectedToken) {
            socket.close(TOKEN_MISMATCH_CLOSE_CODE, "token mismatch");
            return;
          }
          handshakeDone = true;
          clearTimeout(handshakeTimer);
          const ack = helloAckMessageSchema.parse({
            type: "hello-ack",
            version: 3,
            keyCount: 15,
            config: activeTheme !== undefined ? { theme: activeTheme.name } : {},
          });
          socket.send(JSON.stringify(ack));
          for (const handler of connectionHandlers) handler(socket);
          return;
        }
        for (const handler of messageHandlers) handler(message, socket);
      });

      socket.on("error", () => {
        clearTimeout(handshakeTimer);
      });
    });

    wss.on("listening", () => {
      const addr = wss.address();
      if (addr === null || typeof addr === "string") {
        reject(new Error("ws bridge: invalid address"));
        return;
      }
      const port = addr.port;
      const url = `ws://127.0.0.1:${port}`;
      const bridge: WsBridge = {
        port,
        url,
        broadcast: (message) => {
          const payload = JSON.stringify(message);
          for (const client of wss.clients) {
            if (client.readyState === client.OPEN) client.send(payload);
          }
        },
        sendToCaller: (message) => {
          for (const client of wss.clients) {
            if (client.readyState === client.OPEN) client.send(JSON.stringify(message));
          }
        },
        onMessage: (handler) => messageHandlers.push(handler),
        onConnection: (handler) => connectionHandlers.push(handler),
        close: () =>
          new Promise<void>((res) => {
            for (const client of wss.clients) client.close(1000);
            wss.close(() => res());
          }),
      };
      resolve(bridge);
    });

    wss.on("error", (err) => reject(err));
  });
};

export type WsBridgeHttpServer = HttpServer;
