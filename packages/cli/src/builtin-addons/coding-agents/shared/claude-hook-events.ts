import type { AgentStatus } from "./state.js"

/**
 * Claude Code hook events this integration registers, and the status each
 * implies. Every event below was verified present in the installed binary.
 *
 * Two deliberate omissions:
 *
 * - `PostToolUse` is not registered. `PreToolUse` already proves the session
 *   is running and `Stop` returns it to idle, so registering both would
 *   roughly double the hook invocations for no extra signal.
 * - `Notification/idle_prompt` is not registered. It fires about a minute
 *   after `Stop` on a session that is already idle; mapping it to
 *   `waiting_for_human` would turn every idle session into an attention state
 *   and make the summary tile meaningless.
 *
 * `SubagentStart`/`SubagentStop` are likewise absent: subagents are aggregated
 * into their parent session, never surfaced separately.
 */
export interface ClaudeHookRegistration {
  readonly event: string
  /** Claude Code matcher, when the event supports one. */
  readonly matcher?: string
  /** `null` means "remove the lease" rather than set a status. */
  readonly status: AgentStatus | null
}

export const CLAUDE_HOOK_REGISTRATIONS: ReadonlyArray<ClaudeHookRegistration> =
  [
    {
      event: "SessionStart",
      matcher: "startup|resume|clear|fork",
      status: "idle",
    },
    { event: "UserPromptSubmit", status: "running" },
    { event: "PreToolUse", matcher: "*", status: "running" },
    { event: "PermissionRequest", status: "waiting_for_human" },
    {
      event: "Notification",
      matcher: "permission_prompt",
      status: "waiting_for_human",
    },
    { event: "PreCompact", status: "compacting" },
    { event: "PostCompact", status: "running" },
    { event: "Stop", status: "idle" },
    { event: "StopFailure", status: "error" },
    { event: "SessionEnd", status: null },
  ]

export const statusForHookEvent = (
  event: string,
): AgentStatus | null | undefined => {
  const hit = CLAUDE_HOOK_REGISTRATIONS.find((r) => r.event === event)
  return hit === undefined ? undefined : hit.status
}
