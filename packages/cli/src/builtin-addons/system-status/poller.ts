import { cpus, loadavg, totalmem, freemem, uptime } from "node:os";

import type { AddonPoller } from "@/addon/api-types";

export const createPoller = (): AddonPoller => ({
  channels: [
    {
      channel: "system-status:metrics",
      intervalMs: 1_000,
      poll: () => {
        const total = totalmem();
        const free = freemem();
        const used = total - free;
        const cpusList = cpus();
        const cpuUsage =
          cpusList.length > 0
            ? cpusList.reduce((acc, cpu) => {
                const cpuTotal =
                  cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
                const idle = cpu.times.idle;
                return acc + (cpuTotal > 0 ? ((cpuTotal - idle) / cpuTotal) * 100 : 0);
              }, 0) / cpusList.length
            : 0;
        const uptimeSec = uptime();
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m`;
        return {
          metrics: [
            { id: "cpu", label: "CPU", value: cpuUsage.toFixed(0), maxValue: 100 },
            {
              id: "ram",
              label: "RAM",
              value: `${(used / 1024 / 1024 / 1024).toFixed(1)}G`,
              maxValue: total / 1024 / 1024 / 1024,
            },
            { id: "load", label: "Load", value: loadavg()[0]?.toFixed(2) ?? "0" },
            { id: "uptime", label: "Up", value: uptimeStr },
          ],
        };
      },
    },
  ],
});
