# Changelog

## [0.1.1](https://github.com/sergiocarracedo/sireno-deck/compare/@sirenodeck/addon-pomodoro-0.1.0...@sirenodeck/addon-pomodoro-0.1.1) (2026-09-02)


### Bug Fixes

* **addons:** browser-safe dist - explicit .js imports + react/jsx-runtime external ([ac89de3](https://github.com/sergiocarracedo/sireno-deck/commit/ac89de3bd4671b283d6b93a0b62d7cb4038f7bf2))
* **addons:** ship ESM-correct dist via tsdown bundling ([651fabf](https://github.com/sergiocarracedo/sireno-deck/commit/651fabf760081896988674152898f5ea836a8a9b))
* pomodoro notification on timer finish, overlay deck navigation, deck tree page, emulator top bar ([a53b384](https://github.com/sergiocarracedo/sireno-deck/commit/a53b38494c5d4a07333ad67bc01aedbe9a5cf6e5))
* **pomodoro:** decide gestures on live phase — tap/dbl-tap on finished work even when persisted says running ([02863c2](https://github.com/sergiocarracedo/sireno-deck/commit/02863c22ebd73a70c82b7631663fd352008728e1))
* **pomodoro:** initial mount reads as idle, tap/dbl-tap on finished do nothing ([69fb731](https://github.com/sergiocarracedo/sireno-deck/commit/69fb7319782bdfd339afd496edd3fc72bb59e9ad))
* **pomodoro:** pin label variant to primary while countdown is running ([ca24799](https://github.com/sergiocarracedo/sireno-deck/commit/ca247991b7bd31169d51eb3663ed96ea52fcb7e6))
* **pomodoro:** tap-finished resets only, dbl-tap-finished resets+starts; ship paused-at-full + source-serving fix to addons ([3c09752](https://github.com/sergiocarracedo/sireno-deck/commit/3c0975289e900f59eb594229af864303e914669a))
* **pomodoro:** tap-on-finished returns to initial state, dbl-tap restarts; fix 1s tap-to-start delay ([c1c0df3](https://github.com/sergiocarracedo/sireno-deck/commit/c1c0df360c7c80a2b4865ff1fd6d00b54f101a45))
* **publish:** align zod v4 schema defaults + revert stale merge markers ([921dded](https://github.com/sergiocarracedo/sireno-deck/commit/921ddedf3f8746798a3970a0e56571c3ba49a193))
* repair typecheck pipeline (lefthook parity) ([26ff063](https://github.com/sergiocarracedo/sireno-deck/commit/26ff06368b4dedac1011e2cac18a457fd393c1cf))
* **themes:** add muted to all variants, scope button surface to [default, error] ([979456e](https://github.com/sergiocarracedo/sireno-deck/commit/979456e28afec76b0e94cd2e38c2b9f235f81d7f))
* **videos:** use current design-token palette ([e3ada3c](https://github.com/sergiocarracedo/sireno-deck/commit/e3ada3c8b5ef289c82e51b330de6267ceb594bde))
