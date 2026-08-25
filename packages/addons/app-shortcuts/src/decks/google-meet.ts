import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const googleMeetDeck: AddonDeckEntry = {
  id: "app-shortcuts:google-meet",
  name: "Google Meet",
  icon: "addon://app-shortcuts/assets/google-meet.svg",
  buttonColor: "blue",
  paginated: true,
  autoShow: false,
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
    action("mic-off", "Mute", "macro://ctrl+d"),
    action("video", "Camera", "macro://ctrl+e"),
    action("hand", "Raise Hand", "macro://ctrl+shift+h"),
    action("users", "Participants", "macro://ctrl+shift+p"),
    action("caption", "Captions", "macro://ctrl+shift+c"),
    action("monitor", "Present", "macro://ctrl+shift+E"),
    action("message-circle", "Chat", "macro://ctrl+shift+i"),
    action("phone-off", "Leave", "macro://ctrl+w"),
  ],
}
