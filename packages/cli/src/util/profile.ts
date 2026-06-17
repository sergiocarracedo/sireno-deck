import process from "node:process"

const profileGate =
  process.env.SIRENO_PROFILE === "1" &&
  process.env.SIRENO_PROFILE_BACK_TRANSITIONS === "1"

interface ActiveTrace {
  label: string
  start: bigint
}

let activeTrace: ActiveTrace | null = null

export function profileBackTransition(
  label: string,
  marker: "start" | "end",
): void {
  if (!profileGate) return
  if (marker === "start") {
    const start = process.hrtime.bigint()
    activeTrace = { label, start }
    process.stdout.write(
      JSON.stringify({ trace: label, event: "start", deltaMs: 0 }) + "\n",
    )
    return
  }
  if (activeTrace === null) return
  const end = process.hrtime.bigint()
  const deltaMs = Number(end - activeTrace.start) / 1_000_000
  process.stdout.write(
    JSON.stringify({ trace: activeTrace.label, event: "end", deltaMs }) + "\n",
  )
  activeTrace = null
}

export function hop(name: string): void {
  if (!profileGate || activeTrace === null) return
  const now = process.hrtime.bigint()
  const deltaMs = Number(now - activeTrace.start) / 1_000_000
  process.stdout.write(
    JSON.stringify({ trace: activeTrace.label, hop: name, deltaMs }) + "\n",
  )
}

export function resetTraces(): void {
  activeTrace = null
}
