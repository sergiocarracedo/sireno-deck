---

title: RPC timeout shorter than init pipeline makes CLI falsely report start failure
date: 2026-08-21
last_updated: 2026-08-21
category: docs/solutions/runtime-errors/
module: cli/src/cli
problem_type: false_negative
component: development_workflow
severity: medium
symptoms:

- "pnpm dev start --emulator exits with code 1 and prints `daemon: TCP bound on 52937 but runtime state did not appear in 10s`"
- "Daemon IS actually running afterwards — `ss -ltn` shows 52937/52938/5180 bound, `p dev status` reports mode=emulator with uptime climbing"
- "Failure is intermittent — clean runs from cold cache occasionally succeed, then a later run fails"
  diagnosis:
- "Compare CLI wait window (10s) against daemon init pipeline budget: `outputClient.init` calls `spawnFrontendVite`/`spawnConfigUiVite`, each gated by `readyTimeoutMs: 30_000`, with supervisor retry schedule `[2_000, 5_000, 15_000, 30_000, 60_000]` (worst case ~112s)."
- "On first run after dependency cache invalidation, Tailwind+vite dep optimization alone can take 10-15s. Add the module-graph scan, addon materialization, and supervisor spawn — slow-path boot is realistic at 25-35s."
- "CLI's `waitForFullStart({ runtimeTimeoutMs })` polls `runtime-state.json` every 100ms for that window. When the daemon JUST doesn't finish in 10s, the CLI exits 1, but `startInBackground` has already spawned the detached daemon — so the daemon survives but the operator sees a false failure."
  root_cause: "The CLI's runtime-state wait window (10s, bumped from 5s in PR #36) is shorter than the daemon's realistic slow-path boot (≥30s on first run). When the daemon is just slow rather than broken, the CLI gives up early and exits non-zero."
  fix: "Bump `RUNTIME_STATE_TIMEOUT_MS` from 10_000 to 30_000 in `packages/cli/src/cli/startup-display.ts:60`. Update the matching `runtimeTimeoutMs` parameter in `packages/cli/src/cli/index.ts:155`. Update the error string at `packages/cli/src/cli/index.ts:179` from `in 10s` to `in 30s` so the message stays accurate. Total: 4 lines across 2 files."
  prevention: "When designing an RPC/wait window for a child process whose init pipeline has multiple stages with their own per-stage timeouts (child process spawn + supervisor retries + bundle optimization + addon materialization), sum the worst-case stage budgets and add headroom. A 10s window against a 30-60s pipeline will see false negatives by construction."
  verification:
- "Clean run from cold state: `pkill -9 sirenodeck vite; rm -rf /run/user/1000/sireno-deck; pnpm run dev start --emulator` shows `Emulator: http://127.0.0.1:52938?token=...` within ~15s, exit code 0, all three ports bound."
- "Pre-fix: same cold-state run would exit 1 with `runtime state did not appear in 10s` on the slower boots."
  related_prs:
- "bump: wait window 5s → 10s (#36) — too aggressive, this fix rounds up to 30s"
- "invalidate stale runtime-state.json (#33) — orthogonal, ensures CLI never reads a previous session's state"
- "self-heal stale daemon (#31) — orthogonal, kills stale `sirenodeck:dm` holding 52937"
