import type { CommandExecutor } from "../providers/shared"

/**
 * Opens a System Settings pane by its `x-apple.systempreferences:` deep link.
 *
 * ponytail: the Accessibility grant is the one setup step no package manager
 * can perform, and the old flow just printed a System Settings → Privacy &
 * Security → Accessibility breadcrumb and left the user to navigate it. macOS
 * can jump straight to the pane, so offer that instead of prose.
 *
 * Returns false (never throws) on non-darwin platforms or when `open` fails —
 * the caller falls back to printing the manual instructions.
 */
export const openSettingsUrl = async (
  executor: CommandExecutor,
  url: string,
  platform: string = process.platform,
): Promise<boolean> => {
  if (platform !== "darwin") return false
  try {
    const result = await executor.run("open", [url])
    return result.exitCode === 0
  } catch {
    return false
  }
}
