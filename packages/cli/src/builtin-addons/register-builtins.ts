import type { AddonRegistry } from "@/addon/registry"

import { registerBuiltInThemes, registerSiblingThemes } from "@/themes/loader"

import { manifest as codingAgentsManifest } from "./coding-agents"
import { registerCodingAgentsAddon } from "./coding-agents"
import brightnessAddon from "./brightness/index"
import { coreAddon } from "./core/index"
import dateTimeAddon from "./date-time/index"
import emojiSelectorAddon from "./emoji-selector/index"
import { internalSettingsAddon } from "./internal-settings/index"
import mediaPlayerAddon from "./media/index"
import { sessionAddon } from "./session/index"
import { systemStatusAddon } from "./system-status/index"
import valueDisplayAddon from "./value-display/index"
import weatherAddon from "./weather/index"

export const registerBuiltins = (registry: AddonRegistry): void => {
  registerBuiltInThemes(registry)
  registerSiblingThemes(registry)
  registry.load(coreAddon)
  registry.load(internalSettingsAddon)
  registry.load(sessionAddon)
  registry.load(dateTimeAddon)
  registry.load(emojiSelectorAddon)
  registry.load(mediaPlayerAddon)
  registry.load(systemStatusAddon)
  registry.load(valueDisplayAddon)
  registry.load(weatherAddon)
  registry.load(brightnessAddon)
  registerCodingAgentsAddon(registry)
}

/**
 * The builtin manifests, by addon name, as objects rather than file paths.
 *
 * ponytail: the addon bridge used to reach a builtin's handlers by
 * `await import(<path to its index.ts>)`. That works under tsx and fails under
 * the published bundle, where plain node meets TypeScript source and a `@/`
 * path alias and gives up — "Cannot find package '@/deck'". The buttons then
 * rendered but never received data: system metrics sat at "—%", the weather
 * read "---", and the media player showed an empty face, with the failure
 * confined to one error line in the daemon log.
 *
 * These modules are statically imported above, so they are already inside the
 * bundle and inside the dev process alike. Handing the bridge the object it
 * would have imported removes the file-path round trip entirely, which is both
 * faster and immune to how the process was started.
 */
export const BUILTIN_MANIFESTS: ReadonlyMap<string, unknown> = new Map<
  string,
  unknown
>([
  ["core", coreAddon],
  ["internal-settings", internalSettingsAddon],
  ["session", sessionAddon],
  ["date-time", dateTimeAddon],
  ["emoji-selector", emojiSelectorAddon],
  ["media", mediaPlayerAddon],
  ["system-status", systemStatusAddon],
  ["value-display", valueDisplayAddon],
  ["weather", weatherAddon],
  ["brightness", brightnessAddon],
  ["coding-agents", codingAgentsManifest],
])
