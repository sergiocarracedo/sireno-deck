import type pino from "pino";

import {
  createNullMediaProvider,
  type MediaMetadata,
  type MediaProvider,
  ProviderError,
  withTimeout,
} from "@/system/provider";

export interface CommandExecutor {
  run(command: string, args: ReadonlyArray<string>, options?: { timeoutMs?: number }): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
}

export interface LinuxMediaDeps {
  readonly executor: CommandExecutor;
  readonly logger: pino.Logger;
  readonly timeoutMs?: number;
}

const PROBE_TIMEOUT_MS = 2_000;
const TRANSPORT_TIMEOUT_MS = 5_000;
const ONCHANGE_POLL_MS = 2_000;

const parseMetadata = (raw: string): MediaMetadata | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const parts = trimmed.split("\t");
  if (parts.length < 1) return null;
  const title = (parts[0] ?? "").trim();
  if (title.length === 0) return null;
  return {
    title,
    artist: parts[1] !== undefined && parts[1].trim().length > 0 ? parts[1].trim() : null,
    album: parts[2] !== undefined && parts[2].trim().length > 0 ? parts[2].trim() : null,
    artUrl: parts[3] !== undefined && parts[3].trim().length > 0 ? parts[3].trim() : null,
  };
};

const probe = async (executor: CommandExecutor, logger: pino.Logger): Promise<boolean> => {
  const result = await executor.run("which", ["playerctl"]);
  if (result.exitCode !== 0 || result.stdout.trim().length === 0) {
    logger.warn({ path: result.stdout.trim() }, "media: playerctl not found on PATH");
    return false;
  }
  return true;
};

const run = async (deps: LinuxMediaDeps, args: ReadonlyArray<string>, timeoutMs: number): Promise<void> => {
  await withTimeout(
    (async () => {
      const result = await deps.executor.run("playerctl", [...args], { timeoutMs });
      if (result.exitCode !== 0) {
        throw new ProviderError(
          "EXEC_FAILED",
          `playerctl ${args.join(" ")} exited ${result.exitCode}: ${result.stderr.trim()}`,
        );
      }
    })(),
    timeoutMs + 500,
  );
};

const readMetadata = async (deps: LinuxMediaDeps): Promise<MediaMetadata | null> => {
  const result = await deps.executor.run(
    "playerctl",
    ["metadata", "--format", "{{ title }}\t{{ artist }}\t{{ album }}\t{{ mpris:artUrl }}"],
    { timeoutMs: 2_000 },
  );
  if (result.exitCode !== 0) return null;
  return parseMetadata(result.stdout);
};

export const createLinuxMediaProvider = async (
  deps: LinuxMediaDeps,
): Promise<MediaProvider> => {
  const has = await probe(deps.executor, deps.logger);
  if (!has) {
    return createNullMediaProvider(deps.logger);
  }

  const subscribers = new Set<(m: MediaMetadata | null) => void>();
  let lastMeta: MediaMetadata | null = null;
  let onChangeInterval: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const pollOnce = async (): Promise<MediaMetadata | null> => {
    try {
      return await readMetadata(deps);
    } catch {
      return lastMeta;
    }
  };

  onChangeInterval = setInterval(() => {
    if (stopped) return;
    void pollOnce().then((m) => {
      if (stopped) return;
      const sameTitle = lastMeta?.title === m?.title && lastMeta?.artist === m?.artist;
      if (!sameTitle) {
        lastMeta = m;
        for (const h of subscribers) h(m);
      }
    });
  }, ONCHANGE_POLL_MS);

  return {
    async play() {
      await run(deps, ["play"], TRANSPORT_TIMEOUT_MS);
    },
    async pause() {
      await run(deps, ["pause"], TRANSPORT_TIMEOUT_MS);
    },
    async toggle() {
      await run(deps, ["play-pause"], TRANSPORT_TIMEOUT_MS);
    },
    async next() {
      await run(deps, ["next"], TRANSPORT_TIMEOUT_MS);
    },
    async previous() {
      await run(deps, ["previous"], TRANSPORT_TIMEOUT_MS);
    },
    async getCurrent() {
      return pollOnce();
    },
    onChange(handler) {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },
    async stop() {
      stopped = true;
      if (onChangeInterval !== null) {
        clearInterval(onChangeInterval);
        onChangeInterval = null;
      }
    },
  };
};
