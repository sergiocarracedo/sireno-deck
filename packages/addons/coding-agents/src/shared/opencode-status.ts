import type { AgentStatus } from "./state"

export interface OpencodeEventStatusBusy {
  readonly type: "busy"
}

export interface OpencodeEventStatusIdle {
  readonly type: "idle"
}

export interface OpencodeEventStatusRetry {
  readonly type: "retry"
  readonly attempt: number
  readonly message: string
  readonly next: number
}

export type OpencodeSessionStatus =
  | OpencodeEventStatusIdle
  | OpencodeEventStatusBusy
  | OpencodeEventStatusRetry

export type OpencodeEvent =
  | {
      readonly type: "session.status"
      readonly properties: {
        readonly sessionID: string
        readonly status: OpencodeSessionStatus
      }
    }
  | {
      readonly type: "session.idle"
      readonly properties: { readonly sessionID: string }
    }
  | {
      readonly type: "session.compacted"
      readonly properties: { readonly sessionID: string }
    }
  | {
      readonly type: "session.error"
      readonly properties: {
        readonly sessionID: string
        readonly message?: string
      }
    }
  | {
      readonly type: "permission.updated"
      readonly properties: {
        readonly sessionID: string
        readonly id: string
        readonly status: "pending" | "approved" | "denied"
      }
    }

export const opencodeEventToStatus = (
  evt: OpencodeEvent,
): { readonly status: AgentStatus; readonly sessionId: string } | null => {
  if (evt.type === "session.status") {
    const s = evt.properties.status
    if (s.type === "busy")
      return { status: "running", sessionId: evt.properties.sessionID }
    if (s.type === "idle")
      return { status: "idle", sessionId: evt.properties.sessionID }
    if (s.type === "retry")
      return { status: "waiting", sessionId: evt.properties.sessionID }
  }
  if (evt.type === "session.idle") {
    return { status: "idle", sessionId: evt.properties.sessionID }
  }
  if (evt.type === "session.compacted") {
    return { status: "compacting", sessionId: evt.properties.sessionID }
  }
  if (evt.type === "session.error") {
    return { status: "error", sessionId: evt.properties.sessionID }
  }
  if (evt.type === "permission.updated") {
    const status: AgentStatus =
      evt.properties.status === "pending" ? "waiting_for_human" : "idle"
    return { status, sessionId: evt.properties.sessionID }
  }
  return null
}
