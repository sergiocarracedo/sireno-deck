import type { WebSocket } from "ws"

import type { ConfigMutationService } from "@/config/mutation"
import {
  editorMutationResultMessageSchema,
  editorStateMessageSchema,
  type EditorMutationMessage,
  type EditorUndoMessage,
  type EditorStateMessage,
  type WsMessage,
} from "./protocol"

export interface EditorMessageHandlerOptions {
  readonly mutationService: ConfigMutationService
  readonly getState: () => Omit<
    EditorStateMessage,
    "type" | "revision" | "canUndo"
  > & {
    revision?: number
  }
  readonly onChanged?: () => void | Promise<void>
  readonly broadcast: (message: WsMessage) => void
}

export interface EditorMessageHandler {
  readonly onMessage: (message: WsMessage, socket: WebSocket) => void
  readonly onConnection: (socket: WebSocket) => void
  readonly invalidate: () => void
}

export const createEditorMessageHandler = (
  options: EditorMessageHandlerOptions,
): EditorMessageHandler => {
  let revision = options.getState().revision ?? 0
  let applyQueue = Promise.resolve()

  const state = (): EditorStateMessage =>
    editorStateMessageSchema.parse({
      type: "editor-state",
      ...options.getState(),
      revision,
      canUndo: options.mutationService.canUndo(),
    })

  const send = (socket: WebSocket, message: WsMessage): void => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
  }

  const result = (
    socket: WebSocket,
    requestId: string,
    ok: boolean,
    error?: string,
  ): void => {
    send(
      socket,
      editorMutationResultMessageSchema.parse({
        type: "editor-mutation-result",
        requestId,
        ok,
        revision,
        ...(error !== undefined ? { error } : {}),
      }),
    )
  }

  const apply = async (
    socket: WebSocket,
    requestId: string,
    requestRevision: number,
    operation: () => Promise<boolean | void>,
  ): Promise<void> => {
    const task = async (): Promise<void> => {
      if (requestRevision !== revision) {
        result(socket, requestId, false, "stale editor revision")
        send(socket, state())
        return
      }
      try {
        const changed = await operation()
        if (changed === false) {
          result(socket, requestId, false, "nothing to undo")
          return
        }
        revision += 1
        await options.onChanged?.()
        result(socket, requestId, true)
        options.broadcast(state())
      } catch (error) {
        result(
          socket,
          requestId,
          false,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
    const queued = applyQueue.then(task, task)
    applyQueue = queued.then(
      () => undefined,
      () => undefined,
    )
    await queued
  }

  return {
    onMessage: (message, socket) => {
      if (message.type === "editor-state-request") {
        send(socket, state())
        return
      }
      if (message.type === "editor-mutate") {
        void apply(socket, message.requestId, message.revision, () =>
          options.mutationService.apply(message.mutation),
        )
        return
      }
      if (message.type === "editor-undo") {
        void apply(socket, message.requestId, message.revision, () =>
          options.mutationService.undo(),
        )
      }
    },
    onConnection: (socket) => send(socket, state()),
    invalidate: () => {
      revision += 1
      options.broadcast(state())
    },
  }
}

export type { EditorMutationMessage, EditorUndoMessage }
