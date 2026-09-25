import { dirname } from "node:path"
import { platform } from "node:process"

export type OS = "linux" | "darwin" | "win32"

export const currentOS = (): OS => {
  const p = platform
  if (p === "darwin") return "darwin"
  if (p === "win32") return "win32"
  return "linux"
}

export interface TemplateVars {
  name: string
  displayName: string
  description: string
  execStart: string
  restartPolicy: string
  workingDirectory: string
  user?: string
  group?: string
  logPath: string
}

export interface SystemdOptions {
  userLevel: boolean
}

export const renderSystemd = (
  vars: TemplateVars,
  options: SystemdOptions,
): string => {
  const lines: string[] = [
    "[Unit]",
    `Description=${vars.description}`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `ExecStart=${vars.execStart}`,
    `Restart=${vars.restartPolicy}`,
    "RestartSec=5",
    `WorkingDirectory=${vars.workingDirectory}`,
  ]
  if (vars.user !== undefined) lines.push(`User=${vars.user}`)
  if (vars.group !== undefined) lines.push(`Group=${vars.group}`)
  lines.push("Environment=NODE_ENV=production")
  lines.push("")
  lines.push("[Install]")
  lines.push(
    `WantedBy=${options.userLevel ? "default.target" : "multi-user.target"}`,
  )
  return `${lines.join("\n")}\n`
}

const splitExec = (execStart: string): readonly string[] => {
  const tokens: string[] = []
  let buf = ""
  let quote: string | null = null
  for (const ch of execStart) {
    if (quote !== null) {
      if (ch === quote) {
        quote = null
      } else {
        buf += ch
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === " ") {
      if (buf.length > 0) {
        tokens.push(buf)
        buf = ""
      }
    } else {
      buf += ch
    }
  }
  if (buf.length > 0) tokens.push(buf)
  return tokens
}

// ponytail: launchd hands an agent a bare PATH (/usr/bin:/bin:/usr/sbin:/sbin).
// The daemon spawns node-based children (vite) and shells out to Homebrew tools,
// none of which live there. Prepend the usual Homebrew prefixes and the
// directory of the node binary launching us, so children resolve the same
// binaries an interactive shell would.
const darwinPathEntries = (program: string | undefined): string => {
  const entries = [
    ...(program !== undefined ? [dirname(program)] : []),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ]
  return [...new Set(entries)].join(":")
}

export const renderDarwinPlist = (vars: TemplateVars): string => {
  const [program, ...restArgs] = splitExec(vars.execStart)
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>Label</key>",
    `  <string>${vars.name}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    ...(program !== undefined ? [`    <string>${program}</string>`] : []),
    ...restArgs.map((arg) => `    <string>${arg}</string>`),
    "  </array>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
    "  <key>KeepAlive</key>",
    `  <${vars.restartPolicy === "always" ? "true" : "false"}/>`,
    "  <key>EnvironmentVariables</key>",
    "  <dict>",
    "    <key>PATH</key>",
    `    <string>${darwinPathEntries(program)}</string>`,
    // ponytail: launchd starts the daemon with no locale, and a process with
    // no locale on macOS is assumed to speak Mac OS Roman. `pbcopy` then read
    // an emoji's UTF-8 bytes as Mac OS Roman characters and copied those
    // instead — 🏉 arrived as "üèâ" — without failing or logging anything.
    // The clipboard provider states its own encoding now, so this is belt and
    // braces, but any other child process the daemon spawns inherits it too.
    "    <key>LANG</key>",
    "    <string>en_US.UTF-8</string>",
    "    <key>LC_CTYPE</key>",
    "    <string>UTF-8</string>",
    "  </dict>",
    "  <key>WorkingDirectory</key>",
    `  <string>${vars.workingDirectory}</string>`,
    "  <key>StandardOutPath</key>",
    `  <string>${vars.logPath}</string>`,
    "  <key>StandardErrorPath</key>",
    `  <string>${vars.logPath}</string>`,
    "</dict>",
    "</plist>",
  ]
  return `${lines.join("\n")}\n`
}

export const renderWindowsSvc = (vars: TemplateVars): string => {
  return `@echo off
REM ${vars.description}
sc create ${vars.name} binPath= "${vars.execStart}" start= auto
sc description ${vars.name} "${vars.description}"
sc failure "${vars.name}" reset= 86400 actions= restart/5000/restart/10000/restart/30000
`
}

export const renderTemplate = (
  os: OS,
  vars: TemplateVars,
  options: SystemdOptions,
): string => {
  switch (os) {
    case "linux":
      return renderSystemd(vars, options)
    case "darwin":
      return renderDarwinPlist(vars)
    case "win32":
      return renderWindowsSvc(vars)
  }
}
