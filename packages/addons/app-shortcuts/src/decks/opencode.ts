import type { AddonDeckEntry } from "../types"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const opencodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:opencode",
  name: "OpenCode",
  icon: "addon://app-shortcuts/assets/opencode.svg",
  buttonColor: "purple",
  paginated: true,
  autoShow: true,
  isOverlay: true,
  trigger: {
    window_name: ["*opencode*", "*OpenCode*", "*opencode*"],
  },
  buttons: [
    action("command", "Commands", "type://ctrl+p"),
    action("file-plus", "New Session", "type://ctrl+x;ctrl+n"),
    action("list", "Sessions", "type://ctrl+x;ctrl+l"),
    action("box", "Models", "type://ctrl+x;ctrl+m"),
    action("palette", "Themes", "type://ctrl+x;ctrl+t"),
    action("bot", "Agents", "type://ctrl+x;ctrl+a"),
    action("file-edit", "Editor", "type://ctrl+x;ctrl+e"),
    action("panel-left-close", "Sidebar", "type://ctrl+x;ctrl+b"),
    action("activity", "Status", "type://ctrl+x;ctrl+s"),
    action("compress", "Compact", "type://ctrl+x;ctrl+c"),
    action("stop-circle", "Interrupt", "type://escape"),
    action("server", "Providers", "type://ctrl+a"),
    action("star", "Favorite", "type://ctrl+f"),
    action("refresh-cw", "Variant", "type://ctrl+t"),
    action("pencil", "Rename", "type://ctrl+r"),
    action("trash-2", "Delete", "type://ctrl+d"),
  ],
}
