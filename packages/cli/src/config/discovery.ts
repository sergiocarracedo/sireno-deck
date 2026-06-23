import { existsSync } from "node:fs";
import { isAbsolute, resolve as resolvePath } from "node:path";

export interface FindConfigOptions {
  cwd?: string;
  explicitPath?: string;
  envVar?: string;
  homeDir: string;
  xdgConfigHome?: string;
}

export const DEFAULT_CONFIG_FILENAME = "config.yml";

const resolvePath_ = (p: string, cwd: string): string => (isAbsolute(p) ? p : resolvePath(cwd, p));

export const findConfigPath = (options: FindConfigOptions): string | null => {
  const cwd = options.cwd ?? process.cwd();
  if (options.explicitPath) {
    const abs = resolvePath_(options.explicitPath, cwd);
    return existsSync(abs) ? abs : null;
  }
  if (options.envVar) {
    const abs = resolvePath_(options.envVar as string, cwd);
    if (existsSync(abs)) return abs;
  }
  const cwdConfig = resolvePath(cwd, DEFAULT_CONFIG_FILENAME);
  if (existsSync(cwdConfig)) return cwdConfig;
  const xdg = options.xdgConfigHome ?? resolvePath(options.homeDir, ".config");
  const xdgConfig = resolvePath(xdg, "sireno-deck-2", DEFAULT_CONFIG_FILENAME);
  if (existsSync(xdgConfig)) return xdgConfig;
  return null;
};
