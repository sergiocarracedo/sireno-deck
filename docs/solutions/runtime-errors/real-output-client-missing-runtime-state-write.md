---

title: RealOutputClient never wrote runtime-state.json, breaking non-emulator start
date: 2026-08-21
last_updated: 2026-08-21
category: docs/solutions/runtime-errors/
module: cli/src/outputClient/real
problem_type: missing_signal
component: development_workflow
severity: high
symptoms:

- "`p dev start` (without --emulator) exits 1 with `daemon: TCP bound on 52937 but runtime state did not appear in 30s`"
- "Daemon IS running — `ss -ltn` shows 52937 (WS bridge) and 5180 (frontend vite) bound, orchestrator sending deck-configs, `p dev status` would work if runtime-state.json existed"
- "Failure is deterministic — happens 100% of the time for non-emulator starts"
  diagnosis:
- "Compare CLI wait contract: `waitForFullStart` unconditionally calls `waitForRuntimeState` (30s poll for runtime-state.json). Introduced in 4831b781 (PR #25) replacing the old `--remote`-only poll."
- "Compare daemon output clients: `EmulatorOutputClient.init` calls `writeRuntimeState` at two points (emulator.ts:280,299). `RealOutputClient.init` (real.ts) never calls it."
- "service.log for the real-mode daemon (pid 423662) shows full startup: `daemon: pid + token written`, `http-server started`, `VITE ready in 246ms`, `READY 5180`, `real mode: frontend URL`, then orchestrator running — but NO runtime-state write."
- "grep for writeRuntimeState across src/ confirms only emulator.ts calls it (2 sites)."
  root_cause: "Commit 4831b781 made the CLI's 'fully ready' signal (runtime-state.json) unconditional, but the real-mode daemon client never writes that signal. The wait contract and the producer diverged."
  fix: "Add writeRuntimeState call to RealOutputClient.init after renderer.start() + childPids computed. Build RuntimeState with emulatorMode:false, remote:false, configUiUrl:configUiUrl, token from SIRENO_TOKEN env, lanHost/addresses defaults. Update printDaemonUrl to branch on emulatorMode — print 'Frontend: <url>' for real mode. Update status URL line to show frontendUrl when not emulator mode. 3 files, ~35 lines total."
  prevention: "When introducing a cross-process readiness contract (file, socket, env var), ensure ALL producers implement it. Add a test that start in both modes produces the file. Consider a shared init hook or base class if the pattern grows."
  verification:
- "Real mode: `pkill sirenodeck; rm -f /run/user/1000/sireno-deck.* /run/user/1000/runtime-state.json /run/user/1000/service.log; pnpm run dev start` → exit 0, 'Frontend: http://127.0.0.1:5180?token=...', runtime-state.json exists with emulatorMode:false."
- "Emulator mode: `p dev stop && p dev start --emulator` → exit 0, 'Emulator: http://127.0.0.1:52938?token=...', runtime-state.json with emulatorMode:true."
- "Status: `p dev status` shows correct mode (hardware/emulator) and URL in both cases."
- "Lint/format/typecheck clean (only pre-existing CI baseline failures)."
  related_prs:
- "Unconditional runtime-state wait introduced in 4831b781 (PR #25, 'wait for daemon readiness and surface events inline')."
- "PR #37 bumped wait from 10s→30s for a different (slow --emulator boot) symptom — did not fix this bug."
- "EmulatorOutputClient has written runtime-state since before #25 (used by --remote flow)."
