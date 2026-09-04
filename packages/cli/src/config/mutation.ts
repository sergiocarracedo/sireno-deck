import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { createHash } from "node:crypto"
import {
  basename,
  dirname,
  join,
  extname,
  resolve as resolvePath,
} from "node:path"

import { parseDocument, YAMLMap, YAMLSeq } from "yaml"

import { expandButtonReferences } from "./reference-expander"
import { discoverIncludeGraph, resolveIncludes } from "./include-resolver"
import {
  AddonDeckOverrideSchema,
  ButtonDefSchema,
  DeckDefSchema,
  RawConfigSchema,
  UserDeckCreateSchema,
  UserDeckUpdateSchema,
  type RawButtonDef,
  type RawDeckDef,
  type UserDeckCreate,
} from "./schemas"

export interface ConfigSourceDescriptor {
  readonly path: string
  readonly kind: "root" | "include"
  readonly editable: true
  readonly fingerprint: string
}

export type RootButtonMutation =
  | { kind: "add"; deckId: string; button: RawButtonDef; index?: number }
  | {
      kind: "add-button"
      deckId: string
      button: RawButtonDef
      index?: number
      replaceIndex?: number
      newDeck?: UserDeckCreate
    }
  | { kind: "update-deck"; deckId: string; patch: Record<string, unknown> }
  | { kind: "create-deck"; deck: UserDeckCreate }
  | { kind: "create-deck"; deckId: string; deck: RawDeckDef }
  | { kind: "update-deck"; deckId: string; deck: RawDeckDef }
  | { kind: "move-position"; deckId: string; from: number; to: number }
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
  readonly sourceDescriptors: () => ConfigSourceDescriptor[]
  readonly readSource: (path: string, fingerprint?: string) => string
  readonly isEditableSource: (path: string) => boolean
  readonly validateSource: (path: string, content: string) => string[]
  readonly writeAsset: (filename: string, data: string) => Promise<void>
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

const fingerprint = (content: string): string =>
  createHash("sha256").update(content).digest("hex")

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

const validate = (
  raw: string,
  configPath: string,
  replacements: ReadonlyMap<string, string> = new Map(),
): void => {
  let expanded: unknown
  try {
    const inlined = resolveIncludes(raw, configPath, replacements)
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
  const knownFingerprints = new Map<string, string>()
  let queue = Promise.resolve()
  const run = (task: () => void): Promise<void> => {
    const result = queue.then(task, task)
    queue = result.catch(() => undefined)
    return result
  }
  const sourceDescriptors = (): ConfigSourceDescriptor[] =>
    discoverIncludeGraph(rootPath)
      .filter(yamlSource)
      .map((path, index) => {
        const content = readFileSync(path, "utf8")
        return {
          path,
          kind: index === 0 ? "root" : "include",
          editable: true,
          fingerprint: fingerprint(content),
        }
      })
  const sources = (): string[] =>
    sourceDescriptors().map((descriptor) => descriptor.path)
  for (const descriptor of sourceDescriptors())
    knownFingerprints.set(descriptor.path, descriptor.fingerprint)

  const assertUnchanged = (path: string): void => {
    const expected = knownFingerprints.get(path)
    if (expected === undefined) return
    const actual = fingerprint(readFileSync(path, "utf8"))
    if (actual !== expected)
      throw new ConfigMutationError(
        `Source changed outside the editor: ${path}`,
      )
  }
  const assertAllUnchanged = (): void => {
    for (const path of knownFingerprints.keys()) assertUnchanged(path)
  }
  const refreshFingerprints = (): void => {
    const current = sourceDescriptors()
    knownFingerprints.clear()
    for (const descriptor of current)
      knownFingerprints.set(descriptor.path, descriptor.fingerprint)
  }
  const isEditableSource = (path: string): boolean => {
    if (!yamlSource(path)) return false
    return sources().includes(canonical(path))
  }

  return {
    sources,
    sourceDescriptors,
    readSource: (path, expectedFingerprint) => {
      const sourcePath = canonical(path)
      if (!isEditableSource(sourcePath))
        throw new ConfigMutationError(
          `Source is not an editable included YAML: ${sourcePath}`,
        )
      const content = readFileSync(sourcePath, "utf8")
      if (
        expectedFingerprint !== undefined &&
        fingerprint(content) !== expectedFingerprint
      )
        throw new ConfigMutationError(
          `Source changed outside the editor: ${sourcePath}`,
        )
      return content
    },
    isEditableSource,
    validateSource: (path, content) => {
      const sourcePath = canonical(path)
      if (!isEditableSource(sourcePath))
        return [`Source is not an editable included YAML: ${sourcePath}`]
      try {
        validate(
          sourcePath === rootPath ? content : readFileSync(rootPath, "utf8"),
          rootPath,
          sourcePath === rootPath
            ? new Map()
            : new Map([[sourcePath, content]]),
        )
        return []
      } catch (error) {
        return [error instanceof Error ? error.message : String(error)]
      }
    },
    writeAsset: async (filename, data) => {
      const safeName = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_")
      if (safeName === "." || safeName === ".." || safeName.length === 0)
        throw new ConfigMutationError("Invalid asset filename")
      let bytes: Buffer
      try {
        bytes = Buffer.from(data, "base64")
      } catch {
        throw new ConfigMutationError("Invalid asset data")
      }
      const assetDir = join(dirname(rootPath), "assets")
      mkdirSync(assetDir, { recursive: true })
      writeFileSync(join(assetDir, safeName), bytes)
    },
    apply: (mutation) =>
      run(() => {
        if (mutation.kind === "edit-source") {
          const sourcePath = canonical(mutation.path)
          if (!isEditableSource(sourcePath)) {
            throw new ConfigMutationError(
              `Source is not an editable included YAML: ${sourcePath}`,
            )
          }
          assertAllUnchanged()
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
          refreshFingerprints()
          return
        }
        assertAllUnchanged()
        const before = readFileSync(rootPath, "utf8")
        const document = parseDocument(before, { keepSourceTokens: true })
        if (document.errors.length > 0) {
          throw new ConfigMutationError(
            document.errors[0]?.message ?? "Invalid YAML",
          )
        }
        if (
          mutation.kind === "add" ||
          mutation.kind === "add-button" ||
          mutation.kind === "update"
        ) {
          if (!ButtonDefSchema.safeParse(mutation.button).success) {
            throw new ConfigMutationError("Invalid button definition")
          }
        }
        if (mutation.kind === "create-deck") {
          const legacy = "deckId" in mutation
          if (
            !(legacy
              ? DeckDefSchema.safeParse(mutation.deck).success
              : UserDeckCreateSchema.safeParse(mutation.deck).success)
          )
            throw new ConfigMutationError("Invalid new deck definition")
          const deckId = legacy ? mutation.deckId : mutation.deck.id
          if (document.hasIn(["decks", deckId]))
            throw new ConfigMutationError(`Deck already exists: ${deckId}`)
          document.setIn(["decks", deckId], {
            ...(mutation.deck.name !== undefined
              ? { name: mutation.deck.name }
              : {}),
            ...(mutation.deck.icon !== undefined
              ? { icon: mutation.deck.icon }
              : {}),
            ...(mutation.deck.background !== undefined
              ? { background: mutation.deck.background }
              : {}),
            ...(mutation.deck.paginated !== undefined
              ? { paginated: mutation.deck.paginated }
              : {}),
            buttons: [],
          })
        } else if (mutation.kind === "update-deck") {
          if (
            "deck" in mutation
              ? !DeckDefSchema.safeParse(mutation.deck).success
              : !UserDeckUpdateSchema.safeParse(mutation.patch).success
          )
            throw new ConfigMutationError("Invalid deck update")
          if (!document.hasIn(["decks", mutation.deckId]))
            throw new ConfigMutationError(`Deck not found: ${mutation.deckId}`)
          const patch = "deck" in mutation ? mutation.deck : mutation.patch
          for (const [key, value] of Object.entries(patch)) {
            if (value === null)
              document.deleteIn(["decks", mutation.deckId, key])
            else
              document.setIn(
                ["decks", mutation.deckId, key],
                document.createNode(value),
              )
          }
        } else if (
          mutation.kind === "add-button" &&
          mutation.newDeck !== undefined
        ) {
          if (!UserDeckCreateSchema.safeParse(mutation.newDeck).success) {
            throw new ConfigMutationError("Invalid new deck definition")
          }
          if (mutation.button.type !== "core:change-deck") {
            throw new ConfigMutationError(
              "Only core:change-deck buttons can create a deck",
            )
          }
          if (document.hasIn(["decks", mutation.newDeck.id])) {
            throw new ConfigMutationError(
              `Deck already exists: ${mutation.newDeck.id}`,
            )
          }
          document.setIn(["decks", mutation.newDeck.id], {
            ...(mutation.newDeck.name !== undefined
              ? { name: mutation.newDeck.name }
              : {}),
            ...(mutation.newDeck.icon !== undefined
              ? { icon: mutation.newDeck.icon }
              : {}),
            ...(mutation.newDeck.background !== undefined
              ? { background: mutation.newDeck.background }
              : {}),
            ...(mutation.newDeck.paginated !== undefined
              ? { paginated: mutation.newDeck.paginated }
              : {}),
            buttons: [],
          })
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
        } else if (
          mutation.kind !== "update-deck" &&
          mutation.kind !== "create-deck"
        ) {
          const buttons = buttonSequence(document, mutation.deckId)
          if (mutation.kind === "move-position") {
            checkIndex(mutation.from, buttons.items.length, "from")
            checkIndex(mutation.to, buttons.items.length, "to")
            const from = buttons.items[mutation.from]
            const to = buttons.items[mutation.to]
            if (!(from instanceof YAMLMap) || !(to instanceof YAMLMap))
              throw new ConfigMutationError(
                "Only configured buttons can move by position",
              )
            const fromPosition = from.get("position") ?? mutation.from
            const toPosition = to.get("position") ?? mutation.to
            from.set("position", toPosition)
            to.set("position", fromPosition)
          } else if (
            mutation.kind === "add" ||
            (mutation.kind === "add-button" &&
              mutation.replaceIndex === undefined)
          ) {
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
          } else if (mutation.kind === "add-button") {
            const replaceIndex = mutation.replaceIndex
            if (replaceIndex === undefined)
              throw new ConfigMutationError("Missing replace index")
            checkIndex(replaceIndex, buttons.items.length, "replace")
            buttons.items[replaceIndex] = document.createNode(mutation.button)
          } else if (mutation.kind === "delete") {
            checkIndex(mutation.index, buttons.items.length, "delete")
            buttons.items.splice(mutation.index, 1)
          } else if (mutation.kind === "reorder") {
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
        refreshFingerprints()
      }),
    undo: () => {
      let undone = false
      return run(() => {
        const before = history.at(-1)
        if (before === undefined) return
        if (typeof before === "object") {
          assertAllUnchanged()
          atomicWrite(before.path, before.content)
        } else {
          assertAllUnchanged()
          atomicWrite(rootPath, before)
        }
        history.pop()
        undone = true
        refreshFingerprints()
      }).then(() => undone)
    },
    canUndo: () => history.length > 0,
  }
}
