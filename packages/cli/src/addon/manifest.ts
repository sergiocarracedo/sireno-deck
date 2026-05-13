import { z } from "zod"

import { SIRENO_ADDON_API_VERSION } from "./api.js"

const AddonPackageSchema = z.object({
  name: z.string().min(1),
  sirenoAddon: z.object({
    apiVersion: z.number().int().positive(),
    main: z.string().min(1),
  })
    .strict(),
})
  .passthrough()

export interface AddonManifest {
  apiVersion: number
  main: string
  name: string
}

export class AddonManifestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AddonManifestError"
  }
}

export function validateAddonManifest(data: unknown): AddonManifest {
  const result = AddonPackageSchema.safeParse(data)
  if (!result.success) {
    throw new AddonManifestError(result.error.issues[0]?.message ?? "Invalid addon manifest")
  }

  return {
    apiVersion: result.data.sirenoAddon.apiVersion,
    main: result.data.sirenoAddon.main,
    name: result.data.name,
  }
}

export function validateAddonApiVersion(manifest: AddonManifest): void {
  if (manifest.apiVersion !== SIRENO_ADDON_API_VERSION) {
    throw new AddonManifestError(
      `Addon '${manifest.name}' declares apiVersion ${manifest.apiVersion}, expected ${SIRENO_ADDON_API_VERSION}`,
    )
  }
}
