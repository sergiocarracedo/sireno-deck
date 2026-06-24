export type {
  LoadedTheme,
  AddonManifest,
  AddonKind,
  ResolvedSirenoAddon,
  AddonLoadIssue,
} from "@/addon/api.ts";
export { AddonRegistry } from "@/addon/registry.ts";
export { registerBuiltInThemes, resolveActiveTheme, BUILT_IN_THEMES } from "./loader.ts";
export type { ResolveThemeOptions, ResolveThemeResult } from "./loader.ts";
export {
  ThemeProvider,
  useTheme,
  ThemeContext,
  type ThemeContextValue,
} from "./use-resolved-theme.tsx";
