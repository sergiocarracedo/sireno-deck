import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

const CHROME_PROCESS_NAMES = [
  "chrome",
  "chromium",
  "google-chrome",
  "google-chrome-stable",
  "Brave",
]

const CHROME_RSS_COMMAND = `ps -eo rss,comm --no-headers | awk '$2 ~ /^(${CHROME_PROCESS_NAMES.join("|")})/ {sum+=$1} END {printf "%.0f", sum/1024}'`

const chromeMemoryButton = {
  type: "value-display:display",
  config: {
    poll_interval_ms: 5000,
    timeout_ms: 2000,
    values: [
      {
        label: "Chrome",
        command: CHROME_RSS_COMMAND,
        formatter: "strip" as const,
        units: " MB",
      },
    ],
  },
}

export const chromeDeck: AddonDeckEntry = {
  id: "app-shortcuts:chrome",
  name: "Chrome",
  icon: "addon://app-shortcuts/assets/chrome.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: [
      "chromium",
      "chrome",
      "chromium-browser",
      "google-chrome",
      "google-chrome-stable",
      "Brave",
    ],
  },
  buttons: [
    action("plus", "New Tab", "macro://ctrl+t"),
    action("x", "Close Tab", "macro://ctrl+w"),
    action("rotate-ccw", "Reopen Tab", "macro://ctrl+shift+t"),
    action("copy", "New Window", "macro://ctrl+n"),
    action("eye-off", "Incognito", "macro://ctrl+shift+n"),
    action("arrow-right", "Next Tab", "macro://ctrl+tab"),
    action("arrow-left", "Prev Tab", "macro://ctrl+shift+tab"),
    action("search", "Find", "macro://ctrl+f"),
    action("chevron-right", "Find Next", "macro://ctrl+g"),
    action("terminal", "DevTools", "macro://ctrl+shift+i"),
    action("rotate-cw", "Reload", "macro://ctrl+r"),
    action("zap", "Hard Reload", "macro://ctrl+shift+r"),
    action("link", "Address Bar", "macro://ctrl+l"),
    action("bookmark", "Bookmarks", "macro://ctrl+shift+o"),
    action("clock", "History", "macro://ctrl+h"),
    action("download", "Downloads", "macro://ctrl+j"),
    action("printer", "Print", "macro://ctrl+p"),
    action("zoom-in", "Zoom In", "macro://ctrl+plus"),
    action("zoom-out", "Zoom Out", "macro://ctrl+minus"),
    action("square", "Zoom Reset", "macro://ctrl+0"),
    action("maximize", "Fullscreen", "macro://f11"),
    action("activity", "Task Manager", "macro://ctrl+shift+esc"),
    chromeMemoryButton,
  ],
}
