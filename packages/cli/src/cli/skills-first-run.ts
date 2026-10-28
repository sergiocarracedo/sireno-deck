import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { confirm, isCancel, note } from "@/cli/prompt"

import { installConfigSkill } from "./commands/skills"

const offerPath = (): string =>
  join(
    process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
    "sirenodeck",
    "skills-offer-v1.json",
  )

export const offerConfigSkillOnFirstRun = async (): Promise<void> => {
  if (process.stdin.isTTY !== true || existsSync(offerPath())) return

  note(
    "Your coding agent can help configure and update Sireno Deck decks, buttons, and themes. This optional skill is installed from GitHub.",
    "Sireno Deck agent skill",
  )
  const answer = await confirm({
    message: "Install the Sireno Deck skill for your coding agent?",
    initialValue: false,
  })
  if (isCancel(answer) || !answer) {
    saveOfferChoice("declined")
    return
  }

  if (await installConfigSkill({ confirmed: true })) saveOfferChoice("accepted")
}

const saveOfferChoice = (choice: "declined" | "accepted"): void => {
  const path = offerPath()
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify({ version: 1, choice }), {
      encoding: "utf8",
      mode: 0o600,
    })
  } catch {
    // The offer is advisory: inability to remember it must not block startup.
  }
}
