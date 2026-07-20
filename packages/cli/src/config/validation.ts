import type { AddonRegistry } from "@/addon/registry"
import { isSystemButtonType } from "@/deck/system-buttons/types"
import type { RawButtonDef, RawConfig } from "./schemas"

export interface BootstrapIssue {
  level: "error" | "warning"
  path: string
  message: string
}

export interface BootstrapResult {
  issues: BootstrapIssue[]
}

export interface FullValidationIssue {
  level: "error" | "warning"
  path: string
  message: string
}

export interface FullValidationResult {
  issues: FullValidationIssue[]
}

export interface PerButtonValidation {
  deckId: string
  buttonIndex: number
  button: RawButtonDef
  buttonId: string
  position: number | undefined
  path: string
  issues: FullValidationIssue[]
}

export interface PerDeckValidation {
  issues: FullValidationIssue[]
  perButton: PerButtonValidation[]
}

const reportDuplicatePositions = (
  deckId: string,
  deck: RawConfig["decks"][string],
): BootstrapIssue[] => {
  const seen = new Map<number, number>()
  const issues: BootstrapIssue[] = []
  deck.buttons.forEach((btn, index) => {
    if (typeof btn === "string") return
    if (btn.position === undefined) return
    const prev = seen.get(btn.position)
    if (prev !== undefined) {
      issues.push({
        level: "error",
        path: `decks.${deckId}.buttons[${index}]`,
        message: `Duplicate position ${btn.position} (also at index ${prev})`,
      })
    } else {
      seen.set(btn.position, index)
    }
  })
  return issues
}

export const validateBootstrap = (config: RawConfig): BootstrapResult => {
  const issues: BootstrapIssue[] = []
  if (!("main" in config.decks)) {
    issues.push({
      level: "warning",
      path: "decks",
      message:
        "Missing required `main` deck — synthetic main deck will be created",
    })
  }
  for (const [id, deck] of Object.entries(config.decks)) {
    issues.push(...reportDuplicatePositions(id, deck))
  }
  return { issues }
}

export const isBootstrapValid = (result: BootstrapResult): boolean =>
  result.issues.every((i) => i.level !== "error")

export const formatBootstrapIssues = (issues: BootstrapIssue[]): string =>
  issues
    .map((issue) => {
      const tag = issue.level === "error" ? "error" : "warning"
      return `[${tag}] ${issue.path}: ${issue.message}`
    })
    .join("\n")

export const validateButton = (
  btn: RawButtonDef,
  registry: AddonRegistry,
  path: string,
): FullValidationIssue[] => {
  const issues: FullValidationIssue[] = []
  if (!registry.hasButtonType(btn.type)) {
    issues.push({
      level: "error",
      path: `${path}.type`,
      message: `Unknown button type: ${btn.type}`,
    })
    return issues
  }
  const def = registry.getButtonType(btn.type)!
  if (isSystemButtonType(btn.type) || def.def.service.internal === true) {
    issues.push({
      level: "error",
      path: `${path}.type`,
      message: `Internal button type ${btn.type} cannot be used in user config`,
    })
    return issues
  }
  const schema = def.def.service.configSchema as
    | {
        safeParse: (input: unknown) => {
          success: boolean
          error?: {
            issues: Array<{ path: Array<string | number>; message: string }>
          }
        }
      }
    | undefined
  if (schema === undefined) return issues
  const parseResult = schema.safeParse(btn.config ?? {})
  if (!parseResult.success) {
    const first = parseResult.error?.issues[0]
    const msg = first
      ? `${first.path.join(".") || "(root)"}: ${first.message}`
      : "zod parse error"
    issues.push({ level: "error", path: `${path}.config`, message: msg })
  }
  return issues
}

export const validateFull = (
  config: RawConfig,
  registry: AddonRegistry,
): FullValidationResult => {
  const issues: FullValidationIssue[] = []
  for (const [deckId, deck] of Object.entries(config.decks)) {
    deck.buttons.forEach((btn, index) => {
      if (typeof btn === "string") return
      const path = `decks.${deckId}.buttons[${index}]`
      issues.push(...validateButton(btn, registry, path))
    })
  }
  return { issues }
}

export const validatePerDeck = (
  config: RawConfig,
  registry: AddonRegistry,
): PerDeckValidation => {
  const issues: FullValidationIssue[] = []
  const perButton: PerButtonValidation[] = []
  for (const [deckId, deck] of Object.entries(config.decks)) {
    deck.buttons.forEach((btn, index) => {
      if (typeof btn === "string") return
      const path = `decks.${deckId}.buttons[${index}]`
      const buttonIssues = validateButton(btn, registry, path)
      const buttonId = btn.position?.toString() ?? `b${index}`
      perButton.push({
        deckId,
        buttonIndex: index,
        button: btn,
        buttonId,
        position: btn.position,
        path,
        issues: buttonIssues,
      })
      issues.push(...buttonIssues)
    })
  }
  return { issues, perButton }
}

export const isFullValid = (result: FullValidationResult): boolean =>
  result.issues.every((i) => i.level !== "error")

export const formatFullIssues = (issues: FullValidationIssue[]): string =>
  issues
    .map((issue) => {
      const tag = issue.level === "error" ? "error" : "warning"
      return `[${tag}] ${issue.path}: ${issue.message}`
    })
    .join("\n")
