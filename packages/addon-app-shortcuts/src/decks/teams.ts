import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const teamsDeck: AddonDeckEntry = {
  id: "app-shortcuts:teams",
  name: "Teams",
  icon: "addon://addon-app-shortcuts/assets/teams.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    process_name: ["teams", "ms-teams", "Microsoft Teams"],
  },
  buttons: [
    action("mic-off", "Mute", "type://ctrl+shift+m"),
    action("video", "Camera", "type://ctrl+shift+o"),
    action("phone-outgoing", "Share", "type://ctrl+shift+e"),
    action("hand", "Raise", "type://ctrl+shift+k"),
    action("message-circle", "Chat", "type://ctrl+1"),
    action("bell", "Activity", "type://ctrl+2"),
    action("calendar", "Calendar", "type://ctrl+3"),
    action("users", "Teams", "type://ctrl+4"),
    action("phone", "Calls", "type://ctrl+5"),
    action("file", "Files", "type://ctrl+6"),
    action("settings", "Settings", "type://ctrl+,"),
    action("search", "Search", "type://ctrl+e"),
  ],
}
