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
    action("plus", "New Tab", "macro://[macos:cmd+t]ctrl+t"),
    action("x", "Close Tab", "macro://[macos:cmd+w]ctrl+w"),
    action(
      "rotate-ccw",
      "Reopen Tab",
      "macro://[macos:cmd+shift+t]ctrl+shift+t",
    ),
    action("copy", "New Window", "macro://[macos:cmd+n]ctrl+n"),
    action("eye-off", "Incognito", "macro://[macos:cmd+shift+n]ctrl+shift+n"),
    action("arrow-right", "Next Tab", "macro://ctrl+tab"),
    action("arrow-left", "Prev Tab", "macro://ctrl+shift+tab"),
    action("search", "Find", "macro://[macos:cmd+f]ctrl+f"),
    action("chevron-right", "Find Next", "macro://[macos:cmd+g]ctrl+g"),
    action("terminal", "DevTools", "macro://[macos:cmd+alt+i]ctrl+shift+i"),
    action("rotate-cw", "Reload", "macro://[macos:cmd+r]ctrl+r"),
    action("zap", "Hard Reload", "macro://[macos:cmd+shift+r]ctrl+shift+r"),
    action("link", "Address Bar", "macro://[macos:cmd+l]ctrl+l"),
    action("bookmark", "Bookmarks", "macro://[macos:cmd+alt+b]ctrl+shift+o"),
    action("clock", "History", "macro://[macos:cmd+y]ctrl+h"),
    action("download", "Downloads", "macro://[macos:cmd+shift+j]ctrl+j"),
    action("printer", "Print", "macro://[macos:cmd+p]ctrl+p"),
    action("zoom-in", "Zoom In", "macro://[macos:cmd+plus]ctrl+plus"),
    action("zoom-out", "Zoom Out", "macro://[macos:cmd+minus]ctrl+minus"),
    action("square", "Zoom Reset", "macro://[macos:cmd+0]ctrl+0"),
    action("maximize", "Fullscreen", "macro://[macos:ctrl+cmd+f]f11"),
    action("activity", "Task Manager", "macro://ctrl+shift+esc"),
    chromeMemoryButton,
  ],
}
