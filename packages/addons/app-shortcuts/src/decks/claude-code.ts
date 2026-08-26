import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const claudeCodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:claude-code",
  name: "Claude Code",
  icon: "addon://app-shortcuts/assets/claude-code.svg",
  buttonColor: "purple",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["claude"],
    window_name: ["*Claude Code*", "*claude*", "*claude code*"],
  },
  buttons: [
    action("help-circle", "Help", "type://?"),
    action("slash", "Command", "type:///"),
    action("mouse-pointer-click", "Accept", "macro://Right"),
    action("corner-down-left", "Insert", "macro://Return"),
    action("x-circle", "Interrupt", "macro://ctrl+c"),
    action("arrow-up", "History Up", "macro://Up"),
    action("arrow-down", "History Down", "macro://Down"),
    action("eye", "Review", "macro://ctrl+Return"),
    action("check-circle", "Approve", "macro://ctrl+shift+y"),
    action("x", "Deny", "macro://ctrl+shift+n"),
    action("save", "Save", "macro://ctrl+s"),
    action("undo-2", "Undo", "macro://ctrl+z"),
    action("redo-2", "Redo", "macro://ctrl+shift+z"),
    action("file-edit", "Edit", "macro://ctrl+e"),
    action("search", "Find", "macro://ctrl+f"),
    action("trash-2", "Clear", "macro://Escape"),
  ],
}
