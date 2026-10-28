import { execa } from "execa"

import type { CommandModule } from "yargs"

import { confirm, isCancel, intro, log, note } from "@/cli/prompt"

const SKILLS_SOURCE =
  "https://github.com/sergiocarracedo/sireno-deck/tree/main/skills/sirenodeck-config"

export interface SkillsOptions {
  readonly yes?: boolean
  readonly confirmed?: boolean
  readonly agents?: ReadonlyArray<string>
  readonly interactive?: boolean
}

export const installConfigSkill = async (
  options: SkillsOptions = {},
): Promise<boolean> => {
  const yes = options.yes === true
  const interactive = options.interactive ?? process.stdin.isTTY === true
  if (!yes && !interactive) {
    note(
      `No terminal is available. Run this command interactively, or use:\n\nnpx skills add ${SKILLS_SOURCE} --skill sirenodeck-config --global`,
      "Install Sireno Deck skill",
    )
    return false
  }

  intro("sirenodeck skills")
  note(
    "Install the Sireno Deck config skill for your preferred coding agent. It helps your agent configure and update decks, buttons, and themes from your config.yml. The skill is installed globally from GitHub; it can read and edit your config only with your agent's normal file access.",
    "Configure decks with your agent",
  )

  if (!yes && options.confirmed !== true) {
    const answer = await confirm({
      message: "Install the Sireno Deck config skill globally?",
      initialValue: false,
    })
    if (isCancel(answer) || !answer) {
      log.info("Skill installation cancelled.")
      return false
    }
  }

  const args = [
    "skills",
    "add",
    SKILLS_SOURCE,
    "--skill",
    "sirenodeck-config",
    "--global",
  ]
  if (options.agents !== undefined && options.agents.length > 0) {
    for (const agent of options.agents) args.push("--agent", agent)
  } else if (yes) {
    // A non-interactive install must choose a target. Explicitly target all
    // supported agents rather than relying on the upstream CLI's default.
    args.push("--agent", "*")
  }
  if (yes) args.push("--yes")

  try {
    await execa("npx", ["--yes", ...args], { stdio: "inherit" })
    log.success("Sireno Deck config skill installed.")
    return true
  } catch (error) {
    log.error(
      `Could not install the skill: ${error instanceof Error ? error.message : String(error)}\nYou can retry with: npx skills add ${SKILLS_SOURCE} --skill sirenodeck-config --global`,
    )
    return false
  }
}

interface SkillsArgs {
  readonly yes?: boolean
  readonly agent?: ReadonlyArray<string>
}

export const skillsCommand: CommandModule<object, SkillsArgs> = {
  command: "skills",
  describe: "Install the Sireno Deck config skill for a coding agent",
  builder: (yargs) =>
    yargs
      .option("yes", {
        alias: "y",
        type: "boolean",
        description:
          "Skip confirmation; if no --agent is provided, install for all supported agents",
        default: false,
      })
      .option("agent", {
        type: "string",
        array: true,
        description:
          "Target agent ID (repeat for multiple agents); without this, choose interactively",
      }),
  handler: async (argv) => {
    const success = await installConfigSkill({
      yes: argv.yes,
      agents: argv.agent,
    })
    if (!success && argv.yes === true) process.exitCode = 1
  },
}
