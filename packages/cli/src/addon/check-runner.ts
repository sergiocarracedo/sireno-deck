import type { AddonCheck, AddonCheckResult } from "./api"
import mediaAddonManifest from "@/builtin-addons/media/index"

export interface AddonCheckInput {
  readonly name: string
  readonly checks?: ReadonlyArray<AddonCheck>
}

export interface AddonCheckOutcome {
  readonly addonName: string
  readonly checkName: string
  readonly available: boolean
  readonly reason?: string
}

// ponytail: probe errors are expected (tool not installed). Catching here
// keeps callers from having to wrap each check in try/catch and keeps the
// display layer uniform.
const runCheck = async (
  addonName: string,
  check: AddonCheck,
): Promise<AddonCheckOutcome> => {
  try {
    const result: AddonCheckResult = await check.check()
    return result.reason !== undefined
      ? {
          addonName,
          checkName: check.name,
          available: result.available,
          reason: result.reason,
        }
      : {
          addonName,
          checkName: check.name,
          available: result.available,
        }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      addonName,
      checkName: check.name,
      available: false,
      reason: `check error: ${message}`,
    }
  }
}

export const runAddonChecks = async (
  addons: ReadonlyArray<AddonCheckInput>,
): Promise<ReadonlyArray<AddonCheckOutcome>> => {
  const all = addons.flatMap((addon) =>
    (addon.checks ?? []).map((check) => runCheck(addon.name, check)),
  )
  return Promise.all(all)
}

// ponytail: the CLI process doesn't share state with the daemon process,
// so it can't introspect a live `AddonRegistry`. Builtin addons ship as
// statically-known TS modules; importing their manifests here is enough
// to enumerate their `checks` for the start banner. External addons are
// out of scope — the registry is built inside the daemon process and the
// CLI doesn't have a way to safely re-resolve their entry files.
export const collectBuiltinAddonChecks = (): ReadonlyArray<AddonCheckInput> => {
  const checks = mediaAddonManifest.checks ?? []
  return checks.length > 0 ? [{ name: mediaAddonManifest.name, checks }] : []
}

// ponytail: probe errors are expected when external tools are missing —
// run checks in parallel so a slow `command -v` doesn't gate the banner.
export const runBuiltinAddonChecks = (): Promise<
  ReadonlyArray<AddonCheckOutcome>
> => runAddonChecks(collectBuiltinAddonChecks())
