import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { confirm, isCancel, note } from "@/cli/prompt"
import { loadConfig } from "@/config/loader"

const PLUGIN_FILE = "sirenodeck-agent-state.js"
const PLUGIN_MARKER = "SIRENODECK_INTEGRATION_ID=coding-agents-v2"

const pluginDir = (): string =>
  join(
    process.env["OPENCODE_CONFIG_DIR"] ??
      process.env["XDG_CONFIG_HOME"] ??
      join(homedir(), ".config"),
    "opencode",
    "plugins",
  )

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

export const onboardCodingAgents = async (
  configPath: string,
  options: { readonly nonInteractive?: boolean; readonly yes?: boolean } = {},
): Promise<boolean> => {
  if (!isCodingAgentsConfigured(configPath) || isOpenCodePluginInstalled()) {
    return false
  }
  if (options.nonInteractive === true) return false
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
  if (isCancel(answer) || !answer) return false
  note(
    `Installed ${installOpenCodePlugin()}. Restart OpenCode to activate it.`,
    "OpenCode integration",
  )
  return true
}
