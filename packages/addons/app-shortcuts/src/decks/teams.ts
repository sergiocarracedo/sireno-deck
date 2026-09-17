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
    action("mic-off", "Mute", "macro://[macos:cmd+shift+m]ctrl+shift+m"),
    action("video", "Camera", "macro://[macos:cmd+shift+o]ctrl+shift+o"),
    action(
      "phone-outgoing",
      "Share",
      "macro://[macos:cmd+shift+e]ctrl+shift+e",
    ),
    action("hand", "Raise", "macro://[macos:cmd+shift+k]ctrl+shift+k"),
    action("message-circle", "Chat", "macro://[macos:cmd+1]ctrl+1"),
    action("bell", "Activity", "macro://[macos:cmd+2]ctrl+2"),
    action("calendar", "Calendar", "macro://[macos:cmd+3]ctrl+3"),
    action("users", "Teams", "macro://[macos:cmd+4]ctrl+4"),
    action("phone", "Calls", "macro://[macos:cmd+5]ctrl+5"),
    action("file", "Files", "macro://[macos:cmd+6]ctrl+6"),
    action("settings", "Settings", "macro://[macos:cmd+,]ctrl+,"),
    action("search", "Search", "macro://[macos:cmd+e]ctrl+e"),
  ],
}
