import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const googleMeetDeck: AddonDeckEntry = {
  id: "app-shortcuts:google-meet",
  name: "Google Meet",
  icon: "addon://addon-app-shortcuts/assets/google-meet.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: false,
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
    window_name: ["*Meet*", "*Google Meet*"],
  },
  buttons: [
    action("mic-off", "Mute", "type://ctrl+d"),
    action("video", "Camera", "type://ctrl+e"),
    action("hand", "Raise Hand", "type://ctrl+shift+h"),
    action("users", "Participants", "type://ctrl+shift+p"),
    action("caption", "Captions", "type://ctrl+shift+c"),
    action("monitor", "Present", "type://ctrl+shift+p"),
    action("message-circle", "Chat", "type://ctrl+shift+i"),
    action("phone-off", "Leave", "type://ctrl+w"),
    action("layout", "Tile View", "type://ctrl+shift+e"),
    action("settings", "Settings", "type://ctrl+shift+s"),
  ],
}
