import { isAbsolute, resolve as resolvePath } from "node:path";

export type IconSource =
  | { kind: "path"; absolutePath: string }
  | { kind: "cli-builtin"; id: string }
  | { kind: "builtin-addon"; addonName: string; subPath: string }
  | { kind: "addon"; addonName: string; subPath: string };

export interface ResolveIconRefContext {
  configDir: string;
  resolveHome(p: string): string;
  builtinIconIds: ReadonlySet<string>;
}

const CLI_BUILTIN_PREFIX = "icon://";
const BUILTIN_ADDON_PREFIX = "builtin://";
const ADDON_PREFIX = "addon://";

const startsWith = (s: string, prefix: string): boolean => s.startsWith(prefix);

export const isLocalIconPath = (ref: string): boolean => {
  if (startsWith(ref, "./") || startsWith(ref, "../") || startsWith(ref, "/")) return true;
  if (startsWith(ref, "~/") || startsWith(ref, "~\\")) return true;
  if (/[\\/]/.test(ref)) return true;
  return false;
};

export const resolveIconRef = (ref: string, ctx: ResolveIconRefContext): IconSource => {
  if (startsWith(ref, CLI_BUILTIN_PREFIX)) {
    const id = ref.slice(CLI_BUILTIN_PREFIX.length);
    if (id.length === 0) {
      throw new Error(`Invalid CLI-builtin icon ref: ${ref} (missing id)`);
    }
    if (!ctx.builtinIconIds.has(id)) {
      throw new Error(`Unknown CLI-builtin icon: ${id}`);
    }
    return { kind: "cli-builtin", id };
  }
  if (startsWith(ref, BUILTIN_ADDON_PREFIX)) {
    const rest = ref.slice(BUILTIN_ADDON_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash <= 0 || slash === rest.length - 1) {
      throw new Error(`Invalid builtin:// addon ref: ${ref}`);
    }
    return {
      kind: "builtin-addon",
      addonName: rest.slice(0, slash),
      subPath: rest.slice(slash + 1),
    };
  }
  if (startsWith(ref, ADDON_PREFIX)) {
    const rest = ref.slice(ADDON_PREFIX.length);
    const slash = rest.indexOf("/");
    if (slash <= 0 || slash === rest.length - 1) {
      throw new Error(`Invalid addon:// ref: ${ref}`);
    }
    return {
      kind: "addon",
      addonName: rest.slice(0, slash),
      subPath: rest.slice(slash + 1),
    };
  }
  if (isLocalIconPath(ref)) {
    const expanded = startsWith(ref, "~") ? ctx.resolveHome(ref) : ref;
    const absolutePath = isAbsolute(expanded) ? expanded : resolvePath(ctx.configDir, expanded);
    return { kind: "path", absolutePath };
  }
  throw new Error(
    `Unrecognized icon ref: ${ref} — must be a relative path, icon://<id>, builtin://<addon>/<path>, or addon://<addon>/<path>`,
  );
};

export const iconSourceToString = (src: IconSource): string => {
  switch (src.kind) {
    case "path":
      return src.absolutePath;
    case "cli-builtin":
      return `icon://${src.id}`;
    case "builtin-addon":
      return `builtin://${src.addonName}/${src.subPath}`;
    case "addon":
      return `addon://${src.addonName}/${src.subPath}`;
  }
};
