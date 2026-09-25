import { globalService as codingAgentsGlobalService } from "./coding-agents/global-entry"

/**
 * Builtin global services, by addon name, as objects rather than file paths.
 *
 * ponytail: a builtin's global service is the thing that actually produces its
 * data, and the bridge used to reach it with `await import(<globalServiceEntry>)`.
 * That path names TypeScript source, so plain node — which is what runs the
 * published bundle — cannot load it, and the addon ends up with buttons that
 * render and never update. `coding-agents` is the one builtin that keeps its
 * service in a separate `global-entry.ts`, deliberately: `index.ts` is pulled
 * into the browser bundle by the frontend's virtual addon registry, and a node
 * builtin reachable from there takes the whole frontend down.
 *
 * This module is therefore NODE-ONLY and must stay that way. It is imported by
 * the addon bridge and nothing on the browser side; importing it from a module
 * the frontend can reach would put `fs` in the browser graph and undo the very
 * separation `global-entry.ts` exists to maintain.
 */
export const BUILTIN_GLOBAL_SERVICES: ReadonlyMap<string, unknown> = new Map<
  string,
  unknown
>([["coding-agents", codingAgentsGlobalService]])
