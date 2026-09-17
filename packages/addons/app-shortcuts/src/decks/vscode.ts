import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const vscodeDeck: AddonDeckEntry = {
  id: "app-shortcuts:vscode",
  name: "VS Code",
  icon: "addon://app-shortcuts/assets/vscode.svg",
  buttonColor: "green",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["code", "code-oss", "Code", "Code Helper"],
    window_name: ["*Visual Studio Code*", "*Code - *"],
  },
  buttons: [
    action("command", "Palette", "macro://[macos:cmd+shift+p]ctrl+shift+p"),
    action("search", "Quick Open", "macro://[macos:cmd+p]ctrl+p"),
    action("terminal", "Terminal", "macro://[macos:cmd+grave]ctrl+grave"),
    action("panel-left-close", "Sidebar", "macro://[macos:cmd+b]ctrl+b"),
    action("search", "Find", "macro://[macos:cmd+f]ctrl+f"),
    action("replace", "Replace", "macro://[macos:cmd+alt+f]ctrl+h"),
    action("columns-2", "Split", "macro://[macos:cmd+/]ctrl+/"),
    action("x-circle", "Close All", "macro://[macos:cmd+k;cmd+w]ctrl+k;ctrl+w"),
    action("mouse-pointer-click", "Definition", "macro://f12"),
    action("hash", "Go Line", "macro://ctrl+g"),
    action(
      "plus-square",
      "Add Cursor",
      "macro://[macos:cmd+alt+down]ctrl+alt+down",
    ),
    action("wand", "Format", "macro://shift+alt+f"),
    action("save", "Save All", "macro://[macos:cmd+k;cmd+s]ctrl+k;ctrl+s"),
    action("wrap-text", "Word Wrap", "macro://alt+z"),
    action("file-plus", "New File", "macro://[macos:cmd+n]ctrl+n"),
    action("settings", "Settings", "macro://[macos:cmd+,]ctrl+,"),
    action("sparkles", "Quick Fix", "macro://[macos:cmd+.]ctrl+."),
    action("pencil-line", "Rename", "macro://f2"),
  ],
}
