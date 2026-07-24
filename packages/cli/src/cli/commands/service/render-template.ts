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
  user: string
  group: string
}

export const renderSystemd = (vars: TemplateVars): string => {
  const lines = [
    "[Unit]",
    `Description=${vars.description}`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    `Type=simple`,
    `ExecStart=${vars.execStart}`,
    `Restart=${vars.restartPolicy}`,
    `RestartSec=5`,
    `WorkingDirectory=${vars.workingDirectory}`,
    `User=${vars.user}`,
    `Group=${vars.group}`,
    `Environment=NODE_ENV=production`,
    `Environment=HOME=${vars.user === "root" ? "/root" : `/home/${vars.user}`}`,
    "",
    "[Install]",
    "WantedBy=multi-user.target",
  ]
  return lines.join("\n") + "\n"
}

export const renderDarwinPlist = (vars: TemplateVars): string => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>Label</key>",
    `  <string>${vars.name}</string>`,
    "  <key>ProgramArguments</key>",
    "  <array>",
    `    <string>${vars.execStart.split(" ")[0]}</string>`,
    `    <string>${vars.execStart.split(" ").slice(1).join(" ")}</string>`,
    "  </array>",
    "  <key>RunAtLoad</key>",
    "  <true/>",
    "  <key>KeepAlive</key>",
    `  <${vars.restartPolicy === "always" ? "true" : "false"}/>`,
    "  <key>WorkingDirectory</key>",
    `  <string>${vars.workingDirectory}</string>`,
    "  <key>StandardOutPath</key>",
    "  <string>/var/log/sireno-deck.log</string>",
    "  <key>StandardErrorPath</key>",
    "  <string>/var/log/sireno-deck.log</string>",
    "</dict>",
    "</plist>",
  ]
  return lines.join("\n") + "\n"
}

export const renderWindowsSvc = (vars: TemplateVars): string => {
  return `@echo off
REM ${vars.description}
sc create ${vars.name} binPath= "${vars.execStart}" start= auto
sc description ${vars.name} "${vars.description}"
sc failure "${vars.name}" reset= 86400 actions= restart/5000/restart/10000/restart/30000
`
}

export const renderTemplate = (os: OS, vars: TemplateVars): string => {
  switch (os) {
    case "linux":
      return renderSystemd(vars)
    case "darwin":
      return renderDarwinPlist(vars)
    case "win32":
      return renderWindowsSvc(vars)
  }
}
