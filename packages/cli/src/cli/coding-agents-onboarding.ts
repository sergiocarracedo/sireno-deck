import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { confirm, isCancel, note } from "@/cli/prompt"
import { loadConfig } from "@/config/loader"
import { CLAUDE_HOOK_REGISTRATIONS } from "@/builtin-addons/coding-agents/shared/claude-hook-events"
import {
  CLAUDE_HOOK_FILENAME,
  CLAUDE_HOOK_MARKER,
  CLAUDE_HOOK_VERSION,
  claudeHookSource,
} from "@/builtin-addons/coding-agents/hook/script"
import { applyEdits, modify, parse, type ParseError } from "jsonc-parser"

const PLUGIN_FILE = "sirenodeck-agent-state.js"
const PLUGIN_SPEC = `./plugins/${PLUGIN_FILE}`
const PLUGIN_MARKER = "SIRENODECK_INTEGRATION_ID=coding-agents-v2"

const opencodeConfigDir = (): string =>
  process.env["OPENCODE_CONFIG_DIR"] ??
  join(process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"), "opencode")

const pluginDir = (): string => join(opencodeConfigDir(), "plugins")

const opencodeConfigPath = (): string =>
  join(opencodeConfigDir(), "opencode.json")

export const opencodePluginPath = (): string => join(pluginDir(), PLUGIN_FILE)

export const isCodingAgentsConfigured = (configPath: string): boolean => {
  if (!existsSync(configPath)) return false
  try {
    return JSON.stringify(loadConfig({ configPath }).config).includes(
      "coding-agents:",
    )
  } catch {
    return false
  }
}

export const isOpenCodePluginInstalled = (): boolean => {
  try {
    return readFileSync(opencodePluginPath(), "utf8").includes(PLUGIN_MARKER)
  } catch {
    return false
  }
}

const readOpenCodeConfig = (): {
  config: Record<string, unknown>
  text: string
} | null => {
  const path = opencodeConfigPath()
  if (!existsSync(path)) return { config: {}, text: "{}" }
  try {
    const text = readFileSync(path, "utf8")
    const errors: ParseError[] = []
    const parsed: unknown = parse(text, errors, { allowTrailingComma: true })
    if (errors.length > 0) return null
    return parsed !== null && typeof parsed === "object"
      ? { config: parsed as Record<string, unknown>, text }
      : null
  } catch {
    return null
  }
}

const pluginSpec = (entry: unknown): unknown =>
  Array.isArray(entry) ? entry[0] : entry

export const isOpenCodePluginEnabled = (): boolean => {
  const config = readOpenCodeConfig()
  const plugins = config?.config["plugin"]
  return (
    Array.isArray(plugins) &&
    plugins.some((entry) => pluginSpec(entry) === PLUGIN_SPEC)
  )
}

export const enableOpenCodePlugin = (): boolean => {
  const config = readOpenCodeConfig()
  if (config === null) return false
  const plugins = Array.isArray(config.config["plugin"])
    ? config.config["plugin"]
    : []
  if (!plugins.some((entry) => pluginSpec(entry) === PLUGIN_SPEC)) {
    plugins.push(PLUGIN_SPEC)
    const updated = applyEdits(
      config.text,
      modify(config.text, ["plugin"], plugins, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      }),
    )
    const path = opencodeConfigPath()
    mkdirSync(opencodeConfigDir(), { recursive: true, mode: 0o700 })
    writeFileSync(path, updated, {
      encoding: "utf8",
      mode: 0o600,
    })
  }
  return true
}

export const codingAgentsPluginSource = `// ${PLUGIN_MARKER}
// Managed by Sireno Deck. Re-running setup replaces this file.
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const dir = join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "sirenodeck", "coding-agents");
const file = join(dir, "opencode-" + process.pid + ".json");
let currentState = "idle";
let currentSessionID;
const write = (state, sessionID) => {
  currentState = state;
  if (sessionID) currentSessionID = sessionID;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmp = file + ".tmp";
  writeFileSync(tmp, JSON.stringify({ pid: process.pid, cwd: process.cwd(), state: currentState, sessionID: currentSessionID, updatedAt: Date.now() }), { mode: 0o600 });
  renameSync(tmp, file);
};
write("idle");

export const SirenoDeckAgentStatePlugin = async () => ({
  event: async ({ event }) => {
    const p = event?.properties || {};
    const sessionID = p.sessionID;
    switch (event?.type) {
      case "session.status":
        write(p.status?.type === "idle" ? "idle" : p.status?.type === "retry" ? "waiting" : "running", sessionID);
        break;
      case "session.idle": write("idle", sessionID); break;
      case "permission.asked":
      case "question.asked": write("waiting_for_human", sessionID); break;
      case "session.error": write("error", sessionID); break;
    }
  },
});

process.once("exit", () => { try { unlinkSync(file); } catch {} });
const heartbeat = setInterval(() => write(currentState, currentSessionID), 5000);
process.once("exit", () => clearInterval(heartbeat));
`

export const installOpenCodePlugin = (): string => {
  const path = opencodePluginPath()
  mkdirSync(pluginDir(), { recursive: true, mode: 0o700 })
  writeFileSync(path, codingAgentsPluginSource, {
    encoding: "utf8",
    mode: 0o600,
  })
  return path
}

// ---------------------------------------------------------------------------
// Claude Code
//
// ponytail: OpenCode needs a plugin injected into its own config. Claude Code
// has first-class hooks, so nothing has to be smuggled in — but its
// settings.json is a file the user owns and very likely already has hooks in
// (this machine carries three from other tools). Every edit below is surgical:
// jsonc-parser at the deepest path, ownership decided by a marker inside our
// own command string, and anything unmarked is never read, moved or rewritten.
// ---------------------------------------------------------------------------

const CLAUDE_HOOK_ID = `${CLAUDE_HOOK_MARKER}-v${CLAUDE_HOOK_VERSION}`

export const claudeConfigDir = (): string =>
  process.env["CLAUDE_CONFIG_DIR"] ?? join(homedir(), ".claude")

export const claudeSettingsPath = (): string =>
  join(claudeConfigDir(), "settings.json")

export const claudeHookPath = (): string =>
  join(claudeConfigDir(), "hooks", CLAUDE_HOOK_FILENAME)

const claudeHookCommand = (): string =>
  `node ${JSON.stringify(claudeHookPath())} $EVENT # ${CLAUDE_HOOK_ID}`

const commandFor = (event: string): string =>
  claudeHookCommand().replace("$EVENT", event)

const isOurs = (entry: unknown): boolean => {
  if (entry === null || typeof entry !== "object") return false
  const hooks = (entry as { hooks?: unknown }).hooks
  if (!Array.isArray(hooks)) return false
  return hooks.some((h) => {
    const cmd = (h as { command?: unknown }).command
    return (
      typeof cmd === "string" &&
      (cmd.includes(CLAUDE_HOOK_MARKER) || cmd.includes(CLAUDE_HOOK_FILENAME))
    )
  })
}

export const isClaudeHookInstalled = (): boolean => {
  try {
    return readFileSync(claudeHookPath(), "utf8").includes(CLAUDE_HOOK_ID)
  } catch {
    return false
  }
}

export const installClaudeHook = (): string => {
  const path = claudeHookPath()
  mkdirSync(join(claudeConfigDir(), "hooks"), { recursive: true, mode: 0o700 })
  writeFileSync(path, claudeHookSource, { encoding: "utf8", mode: 0o700 })
  return path
}

interface ClaudeSettings {
  readonly text: string
  readonly config: Record<string, unknown>
}

const readClaudeSettings = (): ClaudeSettings | null => {
  const path = claudeSettingsPath()
  let text: string
  try {
    text = readFileSync(path, "utf8")
  } catch {
    // No settings file yet — start from an empty object.
    return { text: "{}", config: {} }
  }
  const errors: ParseError[] = []
  const config = parse(text, errors, {
    allowTrailingComma: true,
  }) as Record<string, unknown>
  // Refuse to touch a file we cannot faithfully re-emit.
  if (errors.length > 0 || config === null || typeof config !== "object") {
    return null
  }
  return { text, config }
}

const hookEntriesFor = (event: string): unknown => {
  const reg = CLAUDE_HOOK_REGISTRATIONS.find((r) => r.event === event)
  return {
    ...(reg?.matcher !== undefined ? { matcher: reg.matcher } : {}),
    hooks: [{ type: "command", command: commandFor(event), timeout: 5 }],
  }
}

export const isClaudeHookEnabled = (): boolean => {
  const settings = readClaudeSettings()
  if (settings === null) return false
  const hooks = settings.config["hooks"]
  if (hooks === null || typeof hooks !== "object") return false
  return CLAUDE_HOOK_REGISTRATIONS.every((reg) => {
    const list = (hooks as Record<string, unknown>)[reg.event]
    return Array.isArray(list) && list.some(isOurs)
  })
}

const writeClaudeSettings = (text: string): void => {
  const path = claudeSettingsPath()
  mkdirSync(claudeConfigDir(), { recursive: true, mode: 0o700 })
  const tmp = `${path}.sirenodeck.tmp`
  writeFileSync(tmp, text, { encoding: "utf8", mode: 0o600 })
  renameSync(tmp, path)
}

export const enableClaudeHooks = (): boolean => {
  const settings = readClaudeSettings()
  if (settings === null) return false

  // One backup, before the first edit we ever make to this file.
  const path = claudeSettingsPath()
  const backup = `${path}.sirenodeck.bak`
  if (existsSync(path) && !existsSync(backup)) {
    try {
      copyFileSync(path, backup)
    } catch {
      // Not fatal — the edits below are still surgical.
    }
  }

  let text = settings.text
  for (const reg of CLAUDE_HOOK_REGISTRATIONS) {
    // Re-parse each round so indices stay correct as the document grows.
    const current = parse(text, [], { allowTrailingComma: true }) as Record<
      string,
      unknown
    >
    const hooks = (current["hooks"] ?? {}) as Record<string, unknown>
    const list = Array.isArray(hooks[reg.event])
      ? (hooks[reg.event] as unknown[])
      : []
    const mine = list.findIndex(isOurs)
    // Append at an explicit index, or replace our own entry in place. Sibling
    // entries are never re-serialised, so other tools' hooks survive exactly.
    const index = mine === -1 ? list.length : mine
    text = applyEdits(
      text,
      modify(text, ["hooks", reg.event, index], hookEntriesFor(reg.event), {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      }),
    )
  }
  writeClaudeSettings(text)
  return true
}

export const removeClaudeHook = (): boolean => {
  const settings = readClaudeSettings()
  if (settings === null) return false
  let text = settings.text
  for (const reg of CLAUDE_HOOK_REGISTRATIONS) {
    const current = parse(text, [], { allowTrailingComma: true }) as Record<
      string,
      unknown
    >
    const hooks = (current["hooks"] ?? {}) as Record<string, unknown>
    const list = Array.isArray(hooks[reg.event])
      ? (hooks[reg.event] as unknown[])
      : []
    const kept = list.filter((entry) => !isOurs(entry))
    if (kept.length === list.length) continue
    text = applyEdits(
      text,
      modify(text, ["hooks", reg.event], kept.length > 0 ? kept : undefined, {
        formattingOptions: { insertSpaces: true, tabSize: 2 },
      }),
    )
  }
  writeClaudeSettings(text)
  try {
    unlinkSync(claudeHookPath())
  } catch {
    // Already gone.
  }
  return true
}

const onboardClaudeCode = async (options: {
  readonly yes?: boolean
}): Promise<boolean> => {
  if (isClaudeHookInstalled() && isClaudeHookEnabled()) return false
  note(
    "The coding-agents addon can show each Claude Code session and its live state.\n\n" +
      "Sireno Deck will add hooks to your Claude Code settings. They report only local session state (id, directory, status) to files owned by your user; no prompts or code are captured. Existing hooks are left untouched.",
    "Claude Code integration",
  )
  const answer =
    options.yes === true
      ? true
      : await confirm({
          message: "Add the Claude Code session-state hooks now?",
          initialValue: true,
        })
  if (isCancel(answer) || !answer) return false
  installClaudeHook()
  if (!enableClaudeHooks()) {
    note(
      `Could not update ${claudeSettingsPath()} because it is not valid JSON. Nothing was changed.`,
      "Claude Code integration",
    )
    return false
  }
  note(
    `Installed ${claudeHookPath()}. Hooks apply to sessions started from now on; a backup of your settings is at ${claudeSettingsPath()}.sirenodeck.bak.`,
    "Claude Code integration",
  )
  return true
}

export const onboardCodingAgents = async (
  configPath: string,
  options: { readonly nonInteractive?: boolean; readonly yes?: boolean } = {},
): Promise<boolean> => {
  if (!isCodingAgentsConfigured(configPath)) return false
  // ponytail: this used to bail as soon as OpenCode was set up, which meant a
  // user who had already onboarded OpenCode was never offered the Claude Code
  // hooks at all. The two harnesses are independent; each decides for itself.
  const openCodeDone = isOpenCodePluginInstalled() && isOpenCodePluginEnabled()
  const claudeDone = isClaudeHookInstalled() && isClaudeHookEnabled()
  if (openCodeDone && claudeDone) return false
  // ponytail: with no TTY nobody can answer — @clack's confirm() renders the
  // prompt and then blocks forever on a stdin that will never produce a
  // keypress. `start` calls this BEFORE spawning the daemon, so a piped or
  // redirected stdin (CI, a wrapper script, `| tee`) hung the whole start and
  // surfaced as "port 52937 did not accept connections in 30s" — a daemon that
  // was never launched. runFirstRunCheckIfNeeded already guards this way;
  // keep the check here so every caller inherits it.
  if (options.nonInteractive === true || process.stdin.isTTY !== true) {
    return false
  }
  let changed = false

  if (!openCodeDone) {
    note(
      "The coding-agents addon can show each OpenCode terminal instance and its live state.\n\n" +
        "Sireno Deck will install a global OpenCode plugin. It reports only local process state to files owned by your user; no prompts or code are captured.",
      "OpenCode integration",
    )
    const answer =
      options.yes === true
        ? true
        : await confirm({
            message: "Install the OpenCode instance-state plugin now?",
            initialValue: true,
          })
    if (!isCancel(answer) && answer) {
      installOpenCodePlugin()
      if (enableOpenCodePlugin()) {
        note(
          `Installed and enabled ${opencodePluginPath()}. Restart OpenCode to activate it.`,
          "OpenCode integration",
        )
        changed = true
      } else {
        note(
          "Could not update OpenCode's opencode.json because it is invalid JSON.",
          "OpenCode integration",
        )
      }
    }
  }

  if (!claudeDone) {
    changed = (await onboardClaudeCode(options)) || changed
  }

  return changed
}
