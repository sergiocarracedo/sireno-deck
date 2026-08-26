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
    action("search", "Find", "macro://ctrl+k"),
    action("edit", "New Message", "macro://ctrl+n"),
    action("smile", "Set Status", "macro://ctrl+shift+y"),
    action("keyboard", "Shortcuts", "macro://ctrl+/"),
    action("mic-off", "Mute", "macro://ctrl+shift+m"),
    action("eye-off", "DND", "macro://ctrl+shift+d"),
    action("bookmark", "Saved", "macro://ctrl+shift+s"),
    action("users", "Members", "macro://ctrl+shift+m"),
    action("arrow-left", "Prev", "macro://alt+up"),
    action("arrow-right", "Next", "macro://alt+down"),
    action("corner-up-left", "Reply", "macro://tab"),
    action("send", "Send", "macro://enter"),
  ],
}
