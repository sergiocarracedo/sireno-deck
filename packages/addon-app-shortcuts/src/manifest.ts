import type { AddonManifestV1 } from "./types.js"
import { vscodeDeck } from "./decks/vscode.js"
import { opencodeDeck } from "./decks/opencode.js"
import { chromeDeck } from "./decks/chrome.js"
import { claudeCodeDeck } from "./decks/claude-code.js"
import { slackDeck } from "./decks/slack.js"
import { teamsDeck } from "./decks/teams.js"
import { discordDeck } from "./decks/discord.js"
import { googleMeetDeck } from "./decks/google-meet.js"

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
