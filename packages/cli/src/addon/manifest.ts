import { z } from "zod"

import { SIRENO_ADDON_API_VERSION } from "./api"

const TailwindManifestSchema = z.object({
  safelist: z.array(z.string().min(1)).default([]),
})

const AddonPackageSchema = z.object({
  name: z.string().min(1),
  sirenoAddon: z.object({
    apiVersion: z.number().int().positive(),
    main: z.string().min(1),
    frontend: z.string().min(1).optional(),
  })
    .strict(),
  tailwind: TailwindManifestSchema.optional(),
})
  .passthrough()

export interface AddonManifest {
  apiVersion: number
  main: string
  frontend?: string
  name: string
  tailwindSafelist: string[]
}

export type AddonManifestErrorCode = "api_version_mismatch" | "invalid_manifest"

export class AddonManifestError extends Error {
  constructor(
    message: string,
    public readonly code: AddonManifestErrorCode,
  ) {
    super(message)
    this.name = "AddonManifestError"
  }
}

export function validateAddonManifest(data: unknown): AddonManifest {
  const result = AddonPackageSchema.safeParse(data)
  if (!result.success) {
    throw new AddonManifestError(result.error.issues[0]?.message ?? "Invalid addon manifest", "invalid_manifest")
  }

  return {
    apiVersion: result.data.sirenoAddon.apiVersion,
    main: result.data.sirenoAddon.main,
    frontend: result.data.sirenoAddon.frontend,
    name: result.data.name,
    tailwindSafelist: result.data.tailwind?.safelist ?? [],
  }
}

export function validateAddonApiVersion(manifest: AddonManifest): void {
  if (manifest.apiVersion !== SIRENO_ADDON_API_VERSION) {
    throw new AddonManifestError(
      `Addon '${manifest.name}' declares apiVersion ${manifest.apiVersion}, expected ${SIRENO_ADDON_API_VERSION}`,
      "api_version_mismatch",
    )
  }
}
