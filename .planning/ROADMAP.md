# Roadmap

## Completed Milestones

### v1.7 — Polish & 3rd-Party Fixtures

Completed 2026-07-08. 6 P-items delivered (P1-P8). See `.planning/milestones/v1.7-ROADMAP.md` for full details.

- P1: React Router (service-driven nav)
- P2: `gestureHandlers` default-deny
- P4: Default main deck + n-1 injection + addon auto-register
- P5: `internal?: boolean` on `AddonDeckDefinition`
- P6: `SplitActionSurface` on n-1 (delivered by P4)
- P8: `*Backend` → `*Service` rename

---

## Next — v1.8

Scope TBD. Candidates from v1.7 out-of-scope list:

- [ ] Per-addon frontend authoring (only `date-time/frontend.tsx` exists)
- [ ] Multi-row device support (XL: 32 keys; ships as `DEFAULT_KEY_COUNT = 15`)
- [ ] Mobile companion app
- [ ] Hot-reload of addon code
- [ ] Fix 79 pre-existing `runtime.test.ts` failures (needs forensics)

## Pre-existing known issues (unchanged)

- 79 failures in `runtime.test.ts` (Phase 42/67, needs forensics)
- Frontend-UI clicks bypass gesture stream (ARCHITECTURE.md §9)
- P6 hardware timing acceptance (<200ms) — manual UAT, no device
