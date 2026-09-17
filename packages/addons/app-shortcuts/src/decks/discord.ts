import type { AddonDeckEntry } from "../types.js"

const action = (icon: string, label: string, tap: string) => ({
  type: "core:action",
  config: { icon: `icon://${icon}`, label },
  actions: { tap },
})

export const discordDeck: AddonDeckEntry = {
  id: "app-shortcuts:discord",
  name: "Discord",
  icon: "addon://app-shortcuts/assets/discord.svg",
  buttonColor: "purple",
  paginated: true,
  autoShow: true,
  trigger: {
    process_name: ["discord", "Discord"],
  },
  buttons: [
    action("search", "Find", "macro://[macos:cmd+k]ctrl+k"),
    action("mic-off", "Mute", "macro://[macos:cmd+shift+m]ctrl+shift+m"),
    action("headphones", "Deafen", "macro://[macos:cmd+shift+h]ctrl+shift+h"),
    action("settings", "Settings", "macro://[macos:cmd+,]ctrl+,"),
    // ponytail: was `macro://alt`. A bare modifier is not a valid combo, so
    // the parser fell through to the TEXT path and typed the literal word
    // "alt" into the message box — one tap away from sending it to a channel.
    // Discord has no keyboard shortcut for inviting, so there is nothing to
    // map this to; the button is removed rather than bound to a guess.
    action("arrow-up", "Mention", "macro://alt+shift+@"),
    action("arrow-down", "Next Channel", "macro://tab"),
    action("arrow-up-1", "Prev Channel", "macro://shift+tab"),
    action("pin", "Pinned", "macro://[macos:cmd+p]ctrl+p"),
    action("smile", "Emoji", "macro://[macos:cmd+shift+j]ctrl+shift+j"),
    action("zap", "Nitro", "macro://[macos:cmd+shift+n]ctrl+shift+n"),
    action("logout", "Logout", "macro://[macos:cmd+shift+d]ctrl+shift+d"),
  ],
}
