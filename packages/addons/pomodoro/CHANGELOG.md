# Changelog

## [0.1.2](https://github.com/sergiocarracedo/sireno-deck/compare/@sirenodeck/addon-pomodoro-0.1.1...@sirenodeck/addon-pomodoro-0.1.2) (2026-10-28)


### Features

* **config-ui:** improve form controls and runtime feedback ([dabec9c](https://github.com/sergiocarracedo/sireno-deck/commit/dabec9c0edff73627b345887522c5c432fa4ab01))
* **config-ui:** make remote emulator phone-ready ([05d2c57](https://github.com/sergiocarracedo/sireno-deck/commit/05d2c5756872ba1d20ad5e2df9ca3cfbc90f6324))
* **release:** rename cli package to sirenodeck ([1cd8714](https://github.com/sergiocarracedo/sireno-deck/commit/1cd87146c7a9ae2378db579fb0b78f64e018b742))


### Bug Fixes

* **addon-api:** let addons ship a separate browser bundle so host UI renders ([fdfae6f](https://github.com/sergiocarracedo/sireno-deck/commit/fdfae6f3c08b94aa294a488aef909285fe171257))
* **macos:** make Sireno Deck work end to end on macOS ([b457cb1](https://github.com/sergiocarracedo/sireno-deck/commit/b457cb112b8bb34eccb2743d87a4d7642154001b))
* **macos:** make the daemon start and repair the darwin providers ([2b05666](https://github.com/sergiocarracedo/sireno-deck/commit/2b05666663b17fa0c2db8266d8c2972265cf426b))

## [0.1.1](https://github.com/sergiocarracedo/sireno-deck/compare/@sirenodeck/addon-pomodoro-0.1.0...@sirenodeck/addon-pomodoro-0.1.1) (2026-09-13)


### Features

* **release:** rename cli package to sirenodeck ([1cd8714](https://github.com/sergiocarracedo/sireno-deck/commit/1cd87146c7a9ae2378db579fb0b78f64e018b742))


### Bug Fixes

* **addons:** browser-safe dist - explicit .js imports + react/jsx-runtime external ([ac89de3](https://github.com/sergiocarracedo/sireno-deck/commit/ac89de3bd4671b283d6b93a0b62d7cb4038f7bf2))
* **addons:** ship ESM-correct dist via tsdown bundling ([651fabf](https://github.com/sergiocarracedo/sireno-deck/commit/651fabf760081896988674152898f5ea836a8a9b))
* pomodoro notification on timer finish, overlay deck navigation, deck tree page, emulator top bar ([a53b384](https://github.com/sergiocarracedo/sireno-deck/commit/a53b38494c5d4a07333ad67bc01aedbe9a5cf6e5))
* **pomodoro:** decide gestures on live phase — tap/dbl-tap on finished work even when persisted says running ([02863c2](https://github.com/sergiocarracedo/sireno-deck/commit/02863c22ebd73a70c82b7631663fd352008728e1))
* **pomodoro:** initial mount reads as idle, tap/dbl-tap on finished do nothing ([69fb731](https://github.com/sergiocarracedo/sireno-deck/commit/69fb7319782bdfd339afd496edd3fc72bb59e9ad))
* **pomodoro:** tap-finished resets only, dbl-tap-finished resets+starts; ship paused-at-full + source-serving fix to addons ([3c09752](https://github.com/sergiocarracedo/sireno-deck/commit/3c0975289e900f59eb594229af864303e914669a))
* **pomodoro:** tap-on-finished returns to initial state, dbl-tap restarts; fix 1s tap-to-start delay ([c1c0df3](https://github.com/sergiocarracedo/sireno-deck/commit/c1c0df360c7c80a2b4865ff1fd6d00b54f101a45))
* **publish:** align zod v4 schema defaults + revert stale merge markers ([921dded](https://github.com/sergiocarracedo/sireno-deck/commit/921ddedf3f8746798a3970a0e56571c3ba49a193))
* repair typecheck pipeline (lefthook parity) ([26ff063](https://github.com/sergiocarracedo/sireno-deck/commit/26ff06368b4dedac1011e2cac18a457fd393c1cf))
* **videos:** use current design-token palette ([e3ada3c](https://github.com/sergiocarracedo/sireno-deck/commit/e3ada3c8b5ef289c82e51b330de6267ceb594bde))

## Changelog
