import type { AddonManifestV1 } from "./types"
import { vscodeDeck } from "./decks/vscode"
import { opencodeDeck } from "./decks/opencode"
import { chromeDeck } from "./decks/chrome"
import { claudeCodeDeck } from "./decks/claude-code"
import { slackDeck } from "./decks/slack"
import { teamsDeck } from "./decks/teams"
import { discordDeck } from "./decks/discord"
import { googleMeetDeck } from "./decks/google-meet"

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: "app-shortcuts",
  buttonTypes: {},
  decks: [
    vscodeDeck,
    opencodeDeck,
    chromeDeck,
    claudeCodeDeck,
    slackDeck,
    teamsDeck,
    discordDeck,
    googleMeetDeck,
  ],
}
