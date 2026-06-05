---
status: testing
phase: 45-weather-addon
source: 45-01-SUMMARY.md
started: 2026-06-04
updated: 2026-06-04
---

## Current Test
number: 2
name: BuiltinWeatherButtonSchema accepts all config fields
expected: |
  Schema accepts `units`, `location`, `use_ip_geolocation`, `unavailable_label`, `poll_interval_ms`, `render_interval_ms`. Defaults: `units: 'metric'`, `poll_interval_ms: 600_000`, `render_interval_ms: 600_000`, `unavailable_label: 'Weather'`.
awaiting: user response

## Tests

### 1. Weather addon registered
result: pass

### 4. Open-Meteo client fetches required fields
result: pending

### 5. wttr.in fallback on Open-Meteo error
result: pending

### 6. IP geolocation opt-in
result: pending

### 7. 4-field render
result: pending

### 8. WMO → Lucide icon name map covers 27 codes
result: pending

### 9. 10-minute default refresh
result: pending

### 10. Unavailable state with `unavailable_label`
result: pending

## Summary

total: 10
passed: 1
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
