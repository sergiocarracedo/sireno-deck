import { basename, dirname, resolve } from "node:path"
import { existsSync, readFileSync } from "node:fs"
import { isMap, isScalar, isSeq, parseDocument } from "yaml"
import { createConfigMutationService } from "@/config/mutation"

export const saveAddonProvider = async (
  path: string,
  addonName: string,
  provider: {
    id: string
    type: string
    clientId: string
    calendarIds: string[]
    calendarColors?: Record<string, string>
  },
): Promise<void> => {
  const mutation = createConfigMutationService({ configPath: path })
  const candidates: Array<{ path: string; index: number }> = []
  for (const source of mutation.sources()) {
    const doc = parseDocument(readFileSync(source, "utf8"))
    if (doc.errors.length) continue
    const addons = doc.get("addons")
    if (!isSeq(addons)) continue
    addons.items.forEach((item, index) => {
      const value = isMap(item)
        ? item.get("src")
        : isScalar(item)
          ? item.value
          : undefined
      if (typeof value !== "string") return
      const base = basename(value.replace(/\/$/, ""))
      let name = base === addonName || base === `addon-${addonName}`
      const manifestPath = resolve(dirname(source), value, "sirenodeck.json")
      if (!name && existsSync(manifestPath)) {
        try {
          name =
            JSON.parse(readFileSync(manifestPath, "utf8")).name === addonName
        } catch {
          /* ignore invalid manifests */
        }
      }
      if (name) candidates.push({ path: source, index })
    })
  }
  if (candidates.length !== 1)
    throw new Error(
      `Expected one ${addonName} addon entry; found ${candidates.length}`,
    )
  const target = candidates[0]!
  const document = parseDocument(mutation.readSource(target.path), {
    keepSourceTokens: true,
  })
  const addonPath = ["addons", target.index]
  const item = document.getIn(addonPath)
  if (!isMap(item)) {
    const src =
      typeof item === "string" ? item : isScalar(item) ? item.value : undefined
    if (typeof src !== "string") throw new Error("Invalid addon entry")
    document.setIn(addonPath, document.createNode({ src }))
  }
  const providersPath = [...addonPath, "config", "service", "providers"]
  let providers = document.getIn(providersPath)
  if (providers === undefined) {
    document.setIn(providersPath, [])
    providers = document.getIn(providersPath)
  }
  if (!isSeq(providers)) throw new Error("Calendar providers must be a list")
  const matches = providers.items.filter(
    (entry) => isMap(entry) && entry.get("id") === provider.id,
  )
  if (matches.length > 1)
    throw new Error("Duplicate calendar account IDs in config")
  if (matches.length === 1) {
    const existing = matches[0]!
    if (!isMap(existing) || existing.get("type") !== provider.type)
      throw new Error("Account ID is already used by another provider")
    for (const [key, value] of Object.entries(provider))
      existing.set(key, value)
  } else providers.add(provider)
  await mutation.apply({
    kind: "edit-source",
    path: target.path,
    content: document.toString(),
  })
}
