export type {
  LoadedTheme,
  AddonManifest,
  AddonKind,
  ResolvedSirenoAddon,
  AddonLoadIssue,
} from "@/addon/api";
export { AddonRegistry } from "@/addon/registry";
export {
  ThemeProvider,
  useTheme,
  ThemeContext,
  type ThemeContextValue,
} from "./use-resolved-theme";
