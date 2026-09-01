import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, extname, resolve as resolvePath } from "node:path"

import { parseDocument, YAMLSeq } from "yaml"

import { expandButtonReferences } from "./reference-expander"
import { discoverIncludeGraph, resolveIncludes } from "./include-resolver"
import {
  AddonDeckOverrideSchema,
  ButtonDefSchema,
  RawConfigSchema,
  type RawButtonDef,
} from "./schemas"

export type RootButtonMutation =
  | { kind: "add"; deckId: string; button: RawButtonDef; index?: number }
  | { kind: "update"; deckId: string; index: number; button: RawButtonDef }
  | { kind: "delete"; deckId: string; index: number }
  | { kind: "reorder"; deckId: string; from: number; to: number }
  | { kind: "set-theme"; theme: string }
  | {
      kind: "set-addon-deck-override"
      addonIndex: number
      deckId: string
      override: Record<string, unknown> | null
    }
  | { kind: "edit-source"; path: string; content: string }

export class ConfigMutationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConfigMutationError"
  }
}

export interface ConfigMutationService {
  readonly sources: () => string[]
  readonly readSource: (path: string) => string
  readonly isEditableSource: (path: string) => boolean
  readonly apply: (mutation: RootButtonMutation) => Promise<void>
  readonly undo: () => Promise<boolean>
  readonly canUndo: () => boolean
}

const yamlSource = (path: string): boolean =>
  extname(path).toLowerCase() === ".yml" ||
  extname(path).toLowerCase() === ".yaml"

const canonical = (path: string): string => {
  const absolute = resolvePath(path)
  return existsSync(absolute) ? realpathSync(absolute) : absolute
}

const atomicWrite = (path: string, content: string): void => {
  const dir = dirname(path)
  const tempDir = mkdtempSync(join(dir, ".sirenodeck-config-"))
  const tempPath = join(tempDir, "config.yml")
  try {
    writeFileSync(tempPath, content, {
      encoding: "utf8",
      mode: statSync(path).mode,
    })
    const fd = openSync(tempPath, "r")
    try {
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tempPath, path)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const validate = (raw: string, configPath: string): void => {
  let expanded: unknown
  try {
    const inlined = resolveIncludes(raw, configPath)
    const document = parseDocument(inlined)
    if (document.errors.length > 0) {
      throw new ConfigMutationError(
        document.errors[0]?.message ?? "Invalid YAML",
      )
    }
    expanded = expandButtonReferences(document.toJSON(), dirname(configPath))
  } catch (error) {
    if (error instanceof ConfigMutationError) throw error
    throw new ConfigMutationError(
      error instanceof Error ? error.message : String(error),
    )
  }
  const result = RawConfigSchema.safeParse(expanded)
  if (!result.success) {
    throw new ConfigMutationError(result.error.message)
  }
}

const buttonSequence = (
  document: ReturnType<typeof parseDocument>,
  deckId: string,
): YAMLSeq => {
  const buttons = document.getIn(["decks", deckId, "buttons"], true)
  if (!(buttons instanceof YAMLSeq)) {
    throw new ConfigMutationError(
      `decks.${deckId}.buttons must be a direct YAML sequence; included button sources are not editable by U1`,
    )
  }
  return buttons
}

const checkIndex = (index: number, length: number, name: string): void => {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new ConfigMutationError(`${name} index out of range: ${index}`)
  }
}

export const createConfigMutationService = ({
  configPath,
}: {
  configPath: string
}): ConfigMutationService => {
  const rootPath = canonical(configPath)
  if (!yamlSource(rootPath)) {
    throw new ConfigMutationError(`Config source is not YAML: ${rootPath}`)
  }
  const history: Array<string | { path: string; content: string }> = []
  let queue = Promise.resolve()
  const run = (task: () => void): Promise<void> => {
    const result = queue.then(task, task)
    queue = result.catch(() => undefined)
    return result
  }
  const sources = (): string[] => discoverIncludeGraph(rootPath)
  const isEditableSource = (path: string): boolean => {
    if (!yamlSource(path)) return false
    return sources().includes(canonical(path))
  }

  return {
    sources,
    readSource: (path) => {
      const sourcePath = canonical(path)
      if (!isEditableSource(sourcePath))
        throw new ConfigMutationError(
          `Source is not an editable included YAML: ${sourcePath}`,
        )
      return readFileSync(sourcePath, "utf8")
    },
    isEditableSource,
    apply: (mutation) =>
      run(() => {
        if (mutation.kind === "edit-source") {
          const sourcePath = canonical(mutation.path)
          if (!isEditableSource(sourcePath)) {
            throw new ConfigMutationError(
              `Source is not an editable included YAML: ${sourcePath}`,
            )
          }
          const sourceDocument = parseDocument(mutation.content)
          if (sourceDocument.errors.length > 0)
            throw new ConfigMutationError("Invalid YAML source")
          const beforeSource = readFileSync(sourcePath, "utf8")
          atomicWrite(sourcePath, mutation.content)
          try {
            validate(readFileSync(rootPath, "utf8"), rootPath)
          } catch (error) {
            atomicWrite(sourcePath, beforeSource)
            throw error
          }
          history.push({ path: sourcePath, content: beforeSource })
          return
        }
        const before = readFileSync(rootPath, "utf8")
        const document = parseDocument(before, { keepSourceTokens: true })
        if (document.errors.length > 0) {
          throw new ConfigMutationError(
            document.errors[0]?.message ?? "Invalid YAML",
          )
        }
        if (mutation.kind === "add" || mutation.kind === "update") {
          if (!ButtonDefSchema.safeParse(mutation.button).success) {
            throw new ConfigMutationError("Invalid button definition")
          }
        }
        if (mutation.kind === "set-theme") {
          if (mutation.theme.length === 0) {
            throw new ConfigMutationError("Theme must not be empty")
          }
          document.set("theme", mutation.theme)
        } else if (mutation.kind === "set-addon-deck-override") {
          if (
            !Number.isInteger(mutation.addonIndex) ||
            mutation.addonIndex < 0
          ) {
            throw new ConfigMutationError("Invalid addon index")
          }
          if (
            mutation.override !== null &&
            !AddonDeckOverrideSchema.safeParse(mutation.override).success
          ) {
            throw new ConfigMutationError("Invalid addon deck override")
          }
          if (mutation.override === null) {
            document.deleteIn([
              "addons",
              mutation.addonIndex,
              "config",
              "decks",
              mutation.deckId,
            ])
          } else {
            document.setIn(
              [
                "addons",
                mutation.addonIndex,
                "config",
                "decks",
                mutation.deckId,
              ],
              document.createNode(mutation.override),
            )
          }
        } else {
          const buttons = buttonSequence(document, mutation.deckId)
          if (mutation.kind === "add") {
            const index = mutation.index ?? buttons.items.length
            if (
              !Number.isInteger(index) ||
              index < 0 ||
              index > buttons.items.length
            ) {
              throw new ConfigMutationError(`add index out of range: ${index}`)
            }
            buttons.items.splice(index, 0, document.createNode(mutation.button))
          } else if (mutation.kind === "update") {
            checkIndex(mutation.index, buttons.items.length, "update")
            buttons.items[mutation.index] = document.createNode(mutation.button)
          } else if (mutation.kind === "delete") {
            checkIndex(mutation.index, buttons.items.length, "delete")
            buttons.items.splice(mutation.index, 1)
          } else {
            checkIndex(mutation.from, buttons.items.length, "from")
            checkIndex(mutation.to, buttons.items.length, "to")
            const [item] = buttons.items.splice(mutation.from, 1)
            if (item !== undefined) buttons.items.splice(mutation.to, 0, item)
          }
        }
        const after = document.toString()
        validate(after, rootPath)
        atomicWrite(rootPath, after)
        history.push(before)
      }),
    undo: () => {
      let undone = false
      return run(() => {
        const before = history.at(-1)
        if (before === undefined) return
        if (typeof before === "object") {
          atomicWrite(before.path, before.content)
        } else {
          atomicWrite(rootPath, before)
        }
        history.pop()
        undone = true
      }).then(() => undone)
    },
    canUndo: () => history.length > 0,
  }
}
