import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const slackDeck: AddonDeckEntry = {
  id: "app-shortcuts:slack",
  name: "Slack",
  icon: "addon://app-shortcuts/assets/slack.svg",
  buttonColor: "green",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["slack", "Slack"],
  },
  buttons: [
    action("search", "Find", "macro://[macos:cmd+k]ctrl+k"),
    action("edit", "New Message", "macro://[macos:cmd+n]ctrl+n"),
    action("smile", "Set Status", "macro://[macos:cmd+shift+y]ctrl+shift+y"),
    action("keyboard", "Shortcuts", "macro://[macos:cmd+/]ctrl+/"),
    action("mic-off", "Mute", "macro://[macos:cmd+shift+m]ctrl+shift+m"),
    action("eye-off", "DND", "macro://[macos:cmd+shift+d]ctrl+shift+d"),
    action("bookmark", "Saved", "macro://[macos:cmd+shift+s]ctrl+shift+s"),
    action("users", "Members", "macro://[macos:cmd+shift+m]ctrl+shift+m"),
    action("arrow-left", "Prev", "macro://alt+up"),
    action("arrow-right", "Next", "macro://alt+down"),
    action("corner-up-left", "Reply", "macro://tab"),
    action("send", "Send", "macro://enter"),
  ],
}
