import type { AddonDeckEntry } from "../types.js"

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
    action("mic-off", "Mute", "macro://[macos:cmd+d]ctrl+d"),
    action("video", "Camera", "macro://[macos:cmd+e]ctrl+e"),
    action("hand", "Raise Hand", "macro://[macos:cmd+shift+h]ctrl+shift+h"),
    action("users", "Participants", "macro://[macos:cmd+shift+p]ctrl+shift+p"),
    action("caption", "Captions", "macro://[macos:cmd+shift+c]ctrl+shift+c"),
    action("monitor", "Present", "macro://[macos:cmd+shift+E]ctrl+shift+E"),
    action("message-circle", "Chat", "macro://[macos:cmd+shift+i]ctrl+shift+i"),
    action("phone-off", "Leave", "macro://[macos:cmd+w]ctrl+w"),
  ],
}
