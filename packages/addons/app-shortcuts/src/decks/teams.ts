import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const teamsDeck: AddonDeckEntry = {
  id: "app-shortcuts:teams",
  name: "Teams",
  icon: "addon://app-shortcuts/assets/teams.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["teams", "ms-teams", "Microsoft Teams"],
  },
  buttons: [
    action("mic-off", "Mute", "macro://ctrl+shift+m"),
    action("video", "Camera", "macro://ctrl+shift+o"),
    action("phone-outgoing", "Share", "macro://ctrl+shift+e"),
    action("hand", "Raise", "macro://ctrl+shift+k"),
    action("message-circle", "Chat", "macro://ctrl+1"),
    action("bell", "Activity", "macro://ctrl+2"),
    action("calendar", "Calendar", "macro://ctrl+3"),
    action("users", "Teams", "macro://ctrl+4"),
    action("phone", "Calls", "macro://ctrl+5"),
    action("file", "Files", "macro://ctrl+6"),
    action("settings", "Settings", "macro://ctrl+,"),
    action("search", "Search", "macro://ctrl+e"),
  ],
}
