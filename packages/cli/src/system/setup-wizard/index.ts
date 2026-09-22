export {
  type CapabilityName,
  type CapabilityProbe,
  type ConfigProbe,
  type DesktopSession,
  type InstallStep,
  type InstallStepResult,
  type PackageManager,
  type ProbeDeps,
  type SystemReport,
  type SystemReportSummary,
  type UdevProbe,
  type WizardOutcome,
  UDEV_RULES_PATH,
} from "./types"

export {
  probeAll,
  ACCESSIBILITY_HINT,
  ACCESSIBILITY_SETTINGS_URL,
  hasDarwinAccessibility,
} from "./probe"
export { probeAllCached, resetProbeCache } from "./probe-cache"
export {
  probeMediaAccess,
  probeCommandExecution,
  probeInternetAccess,
  type RuntimeFeatureProbe,
} from "./runtime-features"
export {
  buildInstallPlan,
  needsConfigSeed,
  DARWIN_ACCESSIBILITY_STEP_ID,
} from "./plan"
export {
  formatCapabilityPanel,
  formatResultLine,
  formatStepInstructions,
  formatSummaryLine,
  summarizeReport,
} from "./format"
export { openSettingsUrl } from "./open-settings"
export { defaultConfigSourcePath, seedDefaultConfig } from "./config-seed"
export { isSudoNopasswd, runWithSudo, capturePassword } from "./sudo"
export type { SudoRunResult } from "./sudo"
