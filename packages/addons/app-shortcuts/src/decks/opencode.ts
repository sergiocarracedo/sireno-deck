import type { AddonDeckEntry } from "../types.js"

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
  trigger: {
    process_name: ["opencode", "opencode.exe"],
  },
  buttons: [
    action("command", "Commands", "macro://ctrl+p"),
    action("file-plus", "New Session", "macro://ctrl+x;ctrl+n"),
    action("list", "Sessions", "macro://ctrl+x;ctrl+l"),
    action("box", "Models", "macro://ctrl+x;ctrl+m"),
    action("palette", "Themes", "macro://ctrl+x;ctrl+t"),
    action("bot", "Agents", "macro://ctrl+x;ctrl+a"),
    action("file-edit", "Editor", "macro://ctrl+x;ctrl+e"),
    action("panel-left-close", "Sidebar", "macro://ctrl+x;ctrl+b"),
    action("activity", "Status", "macro://ctrl+x;ctrl+s"),
    action("compress", "Compact", "macro://ctrl+x;ctrl+c"),
    action("stop-circle", "Interrupt", "macro://escape"),
    action("server", "Providers", "macro://ctrl+a"),
    action("star", "Favorite", "macro://ctrl+f"),
    action("refresh-cw", "Variant", "macro://ctrl+t"),
    action("pencil", "Rename", "macro://ctrl+r"),
    action("trash-2", "Delete", "macro://ctrl+d"),
  ],
}
