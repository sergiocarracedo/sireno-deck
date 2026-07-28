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
