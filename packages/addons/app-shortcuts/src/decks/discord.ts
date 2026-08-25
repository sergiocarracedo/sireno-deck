import type { AddonDeckEntry } from "../types"

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
    action("search", "Find", "macro://ctrl+k"),
    action("mic-off", "Mute", "macro://ctrl+shift+m"),
    action("headphones", "Deafen", "macro://ctrl+shift+h"),
    action("settings", "Settings", "macro://ctrl+,"),
    action("user-plus", "Invite", "macro://alt"),
    action("arrow-up", "Mention", "macro://alt+shift+@"),
    action("arrow-down", "Next Channel", "macro://tab"),
    action("arrow-up-1", "Prev Channel", "macro://shift+tab"),
    action("pin", "Pinned", "macro://ctrl+p"),
    action("smile", "Emoji", "macro://ctrl+shift+j"),
    action("zap", "Nitro", "macro://ctrl+shift+n"),
    action("logout", "Logout", "macro://ctrl+shift+d"),
  ],
}
