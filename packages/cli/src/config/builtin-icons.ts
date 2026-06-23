import { homedir } from "node:os";

export const defaultResolveHome = (p: string): string => {
  if (p === "~") return homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return homedir() + p.slice(1);
  }
  return p;
};

export const BUILTIN_CLI_ICONS: ReadonlySet<string> = new Set<string>([
  "play",
  "pause",
  "next",
  "previous",
  "stop",
  "settings",
  "back",
  "home",
  "lock",
  "unlock",
  "wifi",
  "wifi-off",
  "battery-full",
  "battery-half",
  "battery-low",
  "battery-charging",
  "volume-high",
  "volume-mid",
  "volume-low",
  "volume-mute",
  "cpu",
  "memory",
  "clock",
  "calendar",
  "sun",
  "moon",
  "spotify",
  "chrome",
  "firefox",
  "discord",
  "slack",
  "vscode",
  "terminal",
  "folder",
  "file",
  "power",
  "refresh",
  "search",
  "star",
  "heart",
  "check",
  "close",
  "add",
  "remove",
  "menu",
]);
