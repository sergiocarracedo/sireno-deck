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
  type RawButtonDef,
  type RawDeckDef,
} from "./schemas"

export interface ConfigSourceDescriptor {
  readonly path: string
  readonly kind: "root" | "include"
  readonly editable: true
  readonly fingerprint: string
}

export type RootButtonMutation =
  | { kind: "add"; deckId: string; button: RawButtonDef; index?: number }
  | { kind: "update"; deckId: string; index: number; button: RawButtonDef }
  | { kind: "delete"; deckId: string; index: number }
  | { kind: "reorder"; deckId: string; from: number; to: number }
  | { kind: "create-deck"; deckId: string; deck: RawDeckDef }
  | { kind: "update-deck"; deckId: string; deck: RawDeckDef }
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
        } else if (
          mutation.kind === "create-deck" ||
          mutation.kind === "update-deck"
        ) {
          if (mutation.deckId.length === 0) {
            throw new ConfigMutationError("Deck id must not be empty")
          }
          if (!DeckDefSchema.safeParse(mutation.deck).success) {
            throw new ConfigMutationError("Invalid deck definition")
          }
          const decks = document.getIn(["decks"], true)
          if (!(decks instanceof YAMLMap)) {
            throw new ConfigMutationError("decks must be a YAML map")
          }
          if (mutation.kind === "create-deck" && decks.has(mutation.deckId)) {
            throw new ConfigMutationError(
              `Deck id already exists: ${mutation.deckId}`,
            )
          }
          if (mutation.kind === "update-deck") {
            const current = decks.get(mutation.deckId, true)
            if (!(current instanceof YAMLMap))
              throw new ConfigMutationError(
                `Deck not found: ${mutation.deckId}`,
              )
            for (const key of current.items
              .map((pair) => String(pair.key))
              .filter((key) => !(key in mutation.deck)))
              current.delete(key)
            for (const [key, value] of Object.entries(mutation.deck))
              current.set(key, document.createNode(value))
          } else {
            decks.set(mutation.deckId, document.createNode(mutation.deck))
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
