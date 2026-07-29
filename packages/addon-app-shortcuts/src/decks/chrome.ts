import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const chromeDeck: AddonDeckEntry = {
  id: "app-shortcuts:chrome",
  name: "Chrome",
  icon: "addon://addon-app-shortcuts/assets/chrome.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: true,
  isOverlay: true,
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
    action("plus", "New Tab", "type://ctrl+t"),
    action("x", "Close Tab", "type://ctrl+w"),
    action("rotate-ccw", "Reopen Tab", "type://ctrl+shift+t"),
    action("copy", "New Window", "type://ctrl+n"),
    action("eye-off", "Incognito", "type://ctrl+shift+n"),
    action("arrow-right", "Next Tab", "type://ctrl+alt+right"),
    action("arrow-left", "Prev Tab", "type://ctrl+alt+left"),
    action("search", "Find", "type://ctrl+f"),
    action("chevron-right", "Find Next", "type://ctrl+g"),
    action("terminal", "DevTools", "type://ctrl+shift+i"),
    action("rotate-cw", "Reload", "type://ctrl+r"),
    action("zap", "Hard Reload", "type://ctrl+shift+r"),
    action("link", "Address Bar", "type://ctrl+l"),
    action("bookmark", "Bookmarks", "type://ctrl+shift+o"),
    action("clock", "History", "type://ctrl+h"),
    action("download", "Downloads", "type://ctrl+j"),
    action("printer", "Print", "type://ctrl+p"),
    action("zoom-in", "Zoom In", "type://ctrl+plus"),
    action("zoom-out", "Zoom Out", "type://ctrl+minus"),
    action("square", "Zoom Reset", "type://ctrl+0"),
    action("maximize", "Fullscreen", "type://f11"),
  ],
}
