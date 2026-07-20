import { cpus, totalmem, freemem } from "node:os"
import { statfs } from "node:fs/promises"
import type { PubSub } from "@/core/pub-sub"

export interface SystemMetrics {
  cpuPercent: number
  ramUsedBytes: number
  ramTotalBytes: number
  diskUsedBytes: number
  diskTotalBytes: number
  netInterfaceCount: number
}

export const startSystemStatusPoller = (
  pubSub: PubSub,
  signal: AbortSignal,
  cadenceMs = 1000,
): void => {
  let prevCpuTimes: { idle: number; total: number } | null = null

  const tick = (): void => {
    if (signal.aborted) return

    const cpuList = cpus()
    let idle = 0
    let total = 0
    for (const cpu of cpuList) {
      idle += cpu.times.idle
      total +=
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.idle +
        cpu.times.irq
    }
    let cpuPercent = 0
    if (prevCpuTimes !== null) {
      const idleDelta = idle - prevCpuTimes.idle
      const totalDelta = total - prevCpuTimes.total
      cpuPercent = totalDelta > 0 ? Math.round((1 - idleDelta / totalDelta) * 100) : 0
    }
    prevCpuTimes = { idle, total }

    const ramTotal = totalmem()
    const ramUsed = ramTotal - freemem()

    void statfs("/")
      .then((stats) => {
        const diskTotal = Number(stats.blocks) * Number(stats.bsize)
        const diskUsed = (Number(stats.blocks) - Number(stats.bfree)) * Number(stats.bsize)
        const netCount = cpuList.length > 0 ? 1 : 0
        const metrics: SystemMetrics = {
          cpuPercent,
          ramUsedBytes: ramUsed,
          ramTotalBytes: ramTotal,
          diskUsedBytes: diskUsed,
          diskTotalBytes: diskTotal,
          netInterfaceCount: netCount,
        }
        pubSub.publish("runtime:system-status:cpu", {
          value: metrics.cpuPercent,
          unit: "%",
        })
        pubSub.publish("runtime:system-status:ram", {
          value: Math.round((metrics.ramUsedBytes / metrics.ramTotalBytes) * 100),
          total: metrics.ramTotalBytes,
          used: metrics.ramUsedBytes,
          unit: "%",
        })
        pubSub.publish("runtime:system-status:disk", {
          value: Math.round((metrics.diskUsedBytes / metrics.diskTotalBytes) * 100),
          total: metrics.diskTotalBytes,
          used: metrics.diskUsedBytes,
          unit: "%",
        })
        pubSub.publish("runtime:system-status:net", {
          value: metrics.netInterfaceCount,
          unit: "interfaces",
        })
      })
      .catch(() => {
        // statfs can fail on non-Linux; publish whatever we have
        pubSub.publish("runtime:system-status:cpu", {
          value: cpuPercent,
          unit: "%",
        })
        pubSub.publish("runtime:system-status:ram", {
          value: Math.round((ramUsed / ramTotal) * 100),
          unit: "%",
        })
      })
  }

  tick()
  const interval = setInterval(tick, cadenceMs)
  signal.addEventListener("abort", () => clearInterval(interval))
}
