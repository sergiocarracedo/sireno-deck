import { addonNpmRoot } from "@/util/cache-paths.ts";

import type { AddonManifest } from "@/addon/api.ts";

void addonNpmRoot;

export interface BuiltinAddonPoller {
  readonly addonName: string;
  readonly channels: ReadonlyArray<{
    readonly channel: string;
    readonly intervalMs: number;
    readonly poll: () => unknown | Promise<unknown>;
  }>;
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

const weatherPoller: BuiltinAddonPoller = {
  addonName: "weather",
  channels: [
    {
      channel: "weather:current",
      intervalMs: 600000,
      poll: () => ({
        available: false,
        units: "metric" as const,
        description: "Configure weather",
      }),
    },
  ],
};

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

const mediaPlayerPoller: BuiltinAddonPoller = {
  addonName: "media-player",
  channels: [
    {
      channel: "media-player:state",
      intervalMs: 2000,
      poll: () => ({
        title: null,
        artist: null,
        isPlaying: false,
        volume: 0,
        canGoNext: false,
        canGoPrev: false,
      }),
    },
  ],
};

const valueDisplayPoller: BuiltinAddonPoller = {
  addonName: "value-display",
  channels: [
    {
      channel: "value-display:values",
      intervalMs: 5000,
      poll: () => ({ values: [] }),
    },
  ],
};

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

const ALL_POLLERS: ReadonlyArray<BuiltinAddonPoller> = [
  dateTimePoller,
  weatherPoller,
  systemStatusPoller,
  mediaPlayerPoller,
  valueDisplayPoller,
  brightnessPoller,
];

export interface ResolveAddonPollersOptions {
  readonly scanned: ReadonlyArray<{ name: string; manifest: AddonManifest }>;
}

export interface ResolvedPoller {
  readonly addonName: string;
  readonly channels: BuiltinAddonPoller["channels"];
}

const matchesManifest = (manifest: AddonManifest, addonName: string): boolean => {
  if (manifest.name !== undefined && manifest.name !== addonName) return false;
  if (manifest.publishIntervalMs === undefined) return false;
  return true;
};

export const resolveBuiltinAddonPollers = (
  options: ResolveAddonPollersOptions,
): ReadonlyArray<ResolvedPoller> => {
  const out: ResolvedPoller[] = [];
  for (const poller of ALL_POLLERS) {
    const scanned = options.scanned.find((s) => s.name === poller.addonName);
    if (scanned === undefined) continue;
    if (!matchesManifest(scanned.manifest, poller.addonName)) continue;
    out.push({ addonName: poller.addonName, channels: poller.channels });
  }
  return out;
};

void readPackageVersion;
void addonNpmRoot;
void pino;