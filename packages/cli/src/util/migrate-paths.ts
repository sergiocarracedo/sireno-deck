import { existsSync, mkdirSync, renameSync } from "node:fs";

const LEGACY_NAME = "sireno-deck-2";

const legacyHomeDir = (subpath: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home.length === 0) return "";
  return `${home}/${subpath}`;
};

const migrateIfPresent = (currentDir: string, legacyDir: string): void => {
  if (currentDir === legacyDir) return;
  if (!existsSync(legacyDir)) return;
  if (existsSync(currentDir)) return;
  try {
    renameSync(legacyDir, currentDir);
  } catch {
    mkdirSync(currentDir, { recursive: true });
  }
};

export const migrateLegacyPaths = (): void => {
  const xdgConfig = process.env["XDG_CONFIG_HOME"];
  const xdgData = process.env["XDG_DATA_HOME"];
  const xdgCache = process.env["XDG_CACHE_HOME"];
  const home = process.env["HOME"] ?? "";

  if (xdgConfig && xdgConfig.length > 0) {
    migrateIfPresent(`${xdgConfig}/sirenodeck`, `${xdgConfig}/${LEGACY_NAME}`);
  } else if (home.length > 0) {
    migrateIfPresent(`${home}/.config/sirenodeck`, `${home}/.config/${LEGACY_NAME}`);
  }

  if (xdgData && xdgData.length > 0) {
    migrateIfPresent(`${xdgData}/sirenodeck`, `${xdgData}/${LEGACY_NAME}`);
  } else if (home.length > 0) {
    migrateIfPresent(`${home}/.local/share/sirenodeck`, `${home}/.local/share/${LEGACY_NAME}`);
  }

  if (xdgCache && xdgCache.length > 0) {
    migrateIfPresent(`${xdgCache}/sirenodeck`, `${xdgCache}/${LEGACY_NAME}`);
  } else if (home.length > 0) {
    migrateIfPresent(`${home}/.cache/sirenodeck`, `${home}/.cache/${LEGACY_NAME}`);
  }

  const xdgRuntime = process.env["XDG_RUNTIME_DIR"];
  if (xdgRuntime && xdgRuntime.length > 0) {
    const legacyPidFile = `${xdgRuntime}/${LEGACY_NAME}.pid`;
    const legacyTokenFile = `${xdgRuntime}/${LEGACY_NAME}.token`;
    const legacyChildrenFile = `${xdgRuntime}/${LEGACY_NAME}.children.json`;
    const newPidFile = `${xdgRuntime}/sirenodeck.pid`;
    const newTokenFile = `${xdgRuntime}/sirenodeck.token`;
    const newChildrenFile = `${xdgRuntime}/sirenodeck.children.json`;
    if (existsSync(legacyPidFile) && !existsSync(newPidFile)) {
      try { renameSync(legacyPidFile, newPidFile); } catch { /* ignore */ }
    }
    if (existsSync(legacyTokenFile) && !existsSync(newTokenFile)) {
      try { renameSync(legacyTokenFile, newTokenFile); } catch { /* ignore */ }
    }
    if (existsSync(legacyChildrenFile) && !existsSync(newChildrenFile)) {
      try { renameSync(legacyChildrenFile, newChildrenFile); } catch { /* ignore */ }
    }
  }
};