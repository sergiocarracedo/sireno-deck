import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ActionExecutor } from "@/action/executor.ts";
import { fetchWeather } from "@/builtin-addons/weather";
import type { MediaProvider } from "@/system/provider";

import type { AddonManifest } from "@/addon/api.ts";

export interface BuiltinAddonPoller {
  readonly addonName: string;
  readonly channels: ReadonlyArray<{
    readonly channel: string;
    readonly intervalMs: number;
    readonly poll: () => unknown | Promise<unknown>;
  }>;
}

export interface PollerContext {
  readonly executor: ActionExecutor;
  readonly mediaProvider: MediaProvider | null;
}

const dateTimePoller: BuiltinAddonPoller = {
  addonName: "date-time",
  channels: [
    {
      channel: "date-time:now",
      intervalMs: 1000,
      poll: () => ({ now: Date.now() }),
    },
  ],
};

const buildWeatherPoller = (): BuiltinAddonPoller => ({
  addonName: "weather",
  channels: [
    {
      channel: "weather:current",
      intervalMs: 600000,
      poll: realWeatherPoll,
    },
  ],
});
void dateTimePoller;

const weatherLocationKey = (loc: unknown): string => {
  if (typeof loc !== "object" || loc === null) return "";
  const l = loc as { latitude?: unknown; longitude?: unknown };
  return `${String(l.latitude ?? "")},${String(l.longitude ?? "")}`;
};

const lastWeatherByLocation = new Map<
  string,
  { data: unknown; fetchedAt: number }
>();

const currentWeatherLocationKey = (() => {
  let k = "";
  try {
    const { existsSync, readFileSync: rfs } = require("node:fs") as typeof import("node:fs");
    const { resolve } = require("node:path") as typeof import("node:path");
    const configPath = resolve(process.cwd(), "config.yml");
    if (existsSync(configPath)) {
      const raw = rfs(configPath, "utf8");
      const locMatch = raw.match(/location:\s*\n\s+latitude:\s*([\d.-]+)\s*\n\s+longitude:\s*([\d.-]+)/);
      if (locMatch !== null) k = `${locMatch[1]},${locMatch[2]}`;
    }
  } catch {
    k = "";
  }
  return k;
})();

const realWeatherPoll: () => Promise<unknown> = async () => {
  try {
    const { resolve } = require("node:path") as typeof import("node:path");
    const configPath = resolve(process.cwd(), "config.yml");
    if (!require("node:fs").existsSync(configPath)) {
      return { available: false, units: "metric" as const, description: "Configure weather" };
    }
    const raw = require("node:fs").readFileSync(configPath, "utf8") as string;
    const block = raw.match(/core:weather:\s*\n((?:\s+[^\n]+\n)*)/);
    if (block === null) {
      return { available: false, units: "metric" as const, description: "Configure weather" };
    }
    const latMatch = block[1]?.match(/latitude:\s*([\d.-]+)/);
    const lonMatch = block[1]?.match(/longitude:\s*([\d.-]+)/);
    const unitsMatch = block[1]?.match(/units:\s*(metric|imperial)/);
    const nameMatch = block[1]?.match(/name:\s*([^\n]+)/);
    if (latMatch === null || lonMatch === null) {
      return { available: false, units: "metric" as const, description: "Configure weather" };
    }
    const lat = Number.parseFloat(latMatch[1] as string);
    const lon = Number.parseFloat(lonMatch[1] as string);
    const units = (unitsMatch?.[1] as "metric" | "imperial" | undefined) ?? "metric";
    const snapshot = await fetchWeather({ latitude: lat, longitude: lon }, units);
    return {
      available: snapshot.available,
      temperature: snapshot.temperature,
      windSpeed: snapshot.windSpeed,
      description: snapshot.description,
      units,
      ...(nameMatch !== null ? { locationName: nameMatch[1]?.trim() } : {}),
    };
  } catch (err) {
    return {
      available: false,
      units: "metric" as const,
      description: err instanceof Error ? err.message : "fetch failed",
    };
  }
};

void buildWeatherPoller;

const buildMediaPoller = (ctx: PollerContext): BuiltinAddonPoller => ({
  addonName: "media-player",
  channels: [
    {
      channel: "media-player:state",
      intervalMs: 2000,
      poll: async () => {
        if (ctx.mediaProvider === null) {
          return {
            title: null,
            artist: null,
            isPlaying: false,
            volume: 0,
            canGoNext: false,
            canGoPrev: false,
          };
        }
        try {
          const meta = await ctx.mediaProvider.getCurrent();
          return {
            title: meta?.title ?? null,
            artist: meta?.artist ?? null,
            isPlaying: meta !== null,
            volume: 0,
            canGoNext: meta !== null,
            canGoPrev: meta !== null,
          };
        } catch {
          return {
            title: null,
            artist: null,
            isPlaying: false,
            volume: 0,
            canGoNext: false,
            canGoPrev: false,
          };
        }
      },
    },
  ],
});

const systemStatusPoller: BuiltinAddonPoller = {
  addonName: "system-status",
  channels: [
    {
      channel: "system-status:metrics",
      intervalMs: 1000,
      poll: () => {
        const os = require("node:os") as typeof import("node:os");
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const cpus = os.cpus();
        const cpuUsage = cpus.length > 0
          ? cpus.reduce((acc, cpu) => {
              const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
              const idle = cpu.times.idle;
              return acc + (total > 0 ? ((total - idle) / total) * 100 : 0);
            }, 0) / cpus.length
          : 0;
        const uptimeSec = os.uptime();
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const uptime = `${days}d ${hours}h ${minutes}m`;
        return {
          metrics: [
            { id: "cpu", label: "CPU", value: cpuUsage.toFixed(0), maxValue: 100 },
            { id: "ram", label: "RAM", value: `${(used / 1024 / 1024 / 1024).toFixed(1)}G`, maxValue: total / 1024 / 1024 / 1024 },
            { id: "load", label: "Load", value: os.loadavg()[0]?.toFixed(2) ?? "0" },
            { id: "uptime", label: "Up", value: uptime },
          ],
        };
      },
    },
  ],
};

const buildValueDisplayPoller = (ctx: PollerContext): BuiltinAddonPoller => ({
  addonName: "value-display",
  channels: [
    {
      channel: "value-display:values",
      intervalMs: 5000,
      poll: async () => {
        try {
          const { resolve } = require("node:path") as typeof import("node:path");
          const configPath = resolve(process.cwd(), "config.yml");
          if (!require("node:fs").existsSync(configPath)) return { values: [] };
          const raw = require("node:fs").readFileSync(configPath, "utf8") as string;
          const blockMatch = raw.match(/core:value-display:\s*\n((?:\s+[^\n]+\n)*)/);
          if (blockMatch === null) return { values: [] };
          const block = blockMatch[1] ?? "";
          const cmdMatches = [...block.matchAll(/-\s+label:\s*(\S+)\s*\n\s+command:\s*"?([^"\n]+)"?/g)];
          const values: Array<{ label: string; value: string; units?: string }> = [];
          for (const m of cmdMatches) {
            const label = (m[1] ?? "").replace(/^["']|["']$/g, "");
            const cmd = (m[2] ?? "").replace(/^["']|["']$/g, "").trim();
            if (label.length === 0 || cmd.length === 0) continue;
            try {
              const res = await ctx.executor.run(cmd, { timeoutMs: 5000 });
              values.push({
                label,
                value: res.stdout.trim().split("\n")[0] ?? "",
              });
            } catch {
              values.push({ label, value: "err" });
            }
          }
          return { values };
        } catch {
          return { values: [] };
        }
      },
    },
  ],
});

const brightnessPoller: BuiltinAddonPoller = {
  addonName: "brightness",
  channels: [
    {
      channel: "brightness:current",
      intervalMs: 2000,
      poll: () => ({ value: 0, max: 100 }),
    },
  ],
};

const ALL_STATIC_POLLERS: ReadonlyArray<BuiltinAddonPoller> = [
  dateTimePoller,
  systemStatusPoller,
  brightnessPoller,
];

const matchesManifest = (manifest: AddonManifest, addonName: string): boolean => {
  if (manifest.name !== undefined && manifest.name !== addonName) return false;
  if (manifest.publishIntervalMs === undefined) return false;
  return true;
};

export const resolveBuiltinAddonPollers = (
  ctx: PollerContext,
  options: { scanned: ReadonlyArray<{ name: string; manifest: AddonManifest }> },
): ReadonlyArray<BuiltinAddonPoller> => {
  const built: BuiltinAddonPoller[] = [...ALL_STATIC_POLLERS];
  for (const addon of options.scanned) {
    if (!matchesManifest(addon.manifest, addon.name)) continue;
    if (addon.name === "weather") built.push(buildWeatherPoller());
    else if (addon.name === "media-player") built.push(buildMediaPoller(ctx));
    else if (addon.name === "value-display") built.push(buildValueDisplayPoller(ctx));
  }
  return built;
};

void homedir;
void join;
void readFileSync;
void realWeatherPoll;
void lastWeatherByLocation;
void weatherLocationKey;
void currentWeatherLocationKey;