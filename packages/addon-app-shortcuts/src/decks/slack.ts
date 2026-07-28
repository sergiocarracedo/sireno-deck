import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const slackDeck: AddonDeckEntry = {
  id: "app-shortcuts:slack",
  name: "Slack",
  icon: "addon://addon-app-shortcuts/assets/slack.svg",
  buttonColor: "green",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    process_name: ["slack", "Slack"],
  },
  buttons: [
    action("search", "Find", "type://ctrl+k"),
    action("edit", "New Message", "type://ctrl+n"),
    action("smile", "Set Status", "type://ctrl+shift+y"),
    action("keyboard", "Shortcuts", "type://ctrl+/"),
    action("mic-off", "Mute", "type://ctrl+shift+m"),
    action("eye-off", "DND", "type://ctrl+shift+d"),
    action("bookmark", "Saved", "type://ctrl+shift+s"),
    action("users", "Members", "type://ctrl+shift+m"),
    action("arrow-left", "Prev", "type://alt+up"),
    action("arrow-right", "Next", "type://alt+down"),
    action("corner-up-left", "Reply", "type://tab"),
    action("send", "Send", "type://enter"),
  ],
}
