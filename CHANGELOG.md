# Changelog

## [0.2.10](https://github-personal/ReTXChintu/trippin/compare/v0.2.9...v0.2.10) (2026-10-22)


### Features

* **backend:** push notifications to phones ([56121bf](https://github-personal/ReTXChintu/trippin/commit/56121bf935f66a42a46dcd22b85dad34477620c8))
* link a trip to an existing SpendLog group or InFrame event ([fa52806](https://github-personal/ReTXChintu/trippin/commit/fa528060312cdfe1d5438f0b0ed653a7802e7c37))
* **mobile:** linked groups and events open in SpendLog and InFrame ([9602ac8](https://github-personal/ReTXChintu/trippin/commit/9602ac893eb13972f021cc22fbc76ea8f6fa743a))
* **mobile:** push notifications ([b85fc49](https://github-personal/ReTXChintu/trippin/commit/b85fc4988f8406fcbe7925e3306e5b7bc55f6ff1))

## [0.2.9](https://github-personal/ReTXChintu/trippin/compare/v0.2.8...v0.2.9) (2026-10-22)


### Bug Fixes

* **backend:** updates return the new document without the deprecated `new` option ([4ce4d3c](https://github-personal/ReTXChintu/trippin/commit/4ce4d3c0ce29c4112e88216bb643bab84504ebd1))


### Features

* **backend:** one log line per answered request ([c8ffade](https://github-personal/ReTXChintu/trippin/commit/c8ffade24cb1616bd06404a470a46498ab792811))
* **frontend-server:** /api/* forwarded to the backend ([e1015b1](https://github-personal/ReTXChintu/trippin/commit/e1015b1039a8f14c40d907cfa20144da654405b8))

## [0.2.8](https://github-personal/ReTXChintu/trippin/compare/v0.2.7...v0.2.8) (2026-10-22)


### Bug Fixes

* **mobile:** a link being set up no longer spins forever ([58d73ef](https://github-personal/ReTXChintu/trippin/commit/58d73ef1040b06eafbc164be0cad172a7732fbdd))

## [0.2.7](https://github-personal/ReTXChintu/trippin/compare/v0.2.6...v0.2.7) (2026-10-22)


### Bug Fixes

* **mobile:** signing in no longer closes straight away ([3775a6e](https://github-personal/ReTXChintu/trippin/commit/3775a6e1f419d77cbe79b26df786adc831a6b640))

## [0.2.6](https://github-personal/ReTXChintu/trippin/compare/v0.2.5...v0.2.6) (2026-10-21)

## [0.2.5](https://github-personal/ReTXChintu/trippin/compare/v0.2.4...v0.2.5) (2026-10-21)


### Bug Fixes

* **deploy:** read PM2's process list past its out-of-date banner ([495b81b](https://github-personal/ReTXChintu/trippin/commit/495b81b205f5dd48647a8e9b19e0e0bebb5956f7))


### Features

* Trippin as the hub - link a trip to SpendLog and InFrame ([bb5119e](https://github-personal/ReTXChintu/trippin/commit/bb5119ef3dc0192fde31d4a765057300c04851bb))

## [0.2.4](https://github-personal/ReTXChintu/trippin/compare/v0.2.3...v0.2.4) (2026-10-21)


### Bug Fixes

* serve the frontend ourselves so trippin.apk downloads as an .apk ([be09878](https://github-personal/ReTXChintu/trippin/commit/be09878f92d62d86e38ddad54c7eded474b9f171))


### Features

* sign in through the shared identity server ([642b20b](https://github-personal/ReTXChintu/trippin/commit/642b20b15a19121170421d11a0aaecfac984d352))

## [0.2.3](https://github-personal/ReTXChintu/trippin/compare/v0.2.2...v0.2.3) (2026-10-15)

## [0.2.2](https://github-personal/ReTXChintu/trippin/compare/v0.2.1...v0.2.2) (2026-10-15)

## [0.2.1](https://github-personal/ReTXChintu/trippin/compare/v0.2.0...v0.2.1) (2026-10-15)


### Features

* "Download app" downloads the APK; release on tag push ([c721c39](https://github-personal/ReTXChintu/trippin/commit/c721c39aaf2507b4d8bef663e2da187b5ca9d0f3))
* sunrise and sunset for every day of the plan ([0840606](https://github-personal/ReTXChintu/trippin/commit/0840606e2c0e9babd3594e816b9bc37217edcb51))

# 0.2.0 (2026-10-15)


### Bug Fixes

* don't crash trip lists on a malformed votes field ([a2b82d5](https://github-personal/ReTXChintu/trippin/commit/a2b82d5e0eed1367fe19d60f1e723612ee29635e))
* **frontend:** move useClipboard above early returns in TripDetailContent ([4f3d145](https://github-personal/ReTXChintu/trippin/commit/4f3d1457d10a37be755a3b1a147545bcfa81f217))
* production builds were development builds ([d535cbe](https://github-personal/ReTXChintu/trippin/commit/d535cbeddad4375731563c47e4ec85868c7b08fe))
* **release:** disable requireUpstream since repo has no remote yet ([757e431](https://github-personal/ReTXChintu/trippin/commit/757e43102792a87e08676ba9797de71035e62185))
* sign-in works on plain http://IP:port hosting ([e56c184](https://github-personal/ReTXChintu/trippin/commit/e56c184b6b48ee6fe221c9f57e87e2b5a2d64ef4))


### Features

* **ai:** Gemini support with per-user provider and model choice ([22cf2dd](https://github-personal/ReTXChintu/trippin/commit/22cf2dd0512a37cd8fa501afdf83057b19913d1f))
* **brand:** use the Trippin logo everywhere ([dd3fc6b](https://github-personal/ReTXChintu/trippin/commit/dd3fc6b0b1824124cab09bd5824f18fa90d22a9b))
* calmer Plan page ([dfc2e00](https://github-personal/ReTXChintu/trippin/commit/dfc2e00570ad0f63a9e0924b641ceab9d78a1851))
* daily Google caps configurable from .env ([423b872](https://github-personal/ReTXChintu/trippin/commit/423b872acb629634d94016b6f44cf76200f8fd5e))
* day trips with fixed days; place search covers day-trip towns ([fa931be](https://github-personal/ReTXChintu/trippin/commit/fa931be406384addf21ace36df65422295dc9d07))
* **design:** Trippin foundation — tokens, theme, shell, brand ([613b9e3](https://github-personal/ReTXChintu/trippin/commit/613b9e3765df3402e1d1e961a18d20948dc24909))
* **design:** Trippin redesign — every screen ([c25d741](https://github-personal/ReTXChintu/trippin/commit/c25d7414580e24fde39f958dbcdd53bfc2937732))
* drag board — places onto days, on the Plan tab and Compare page ([a2a45ec](https://github-personal/ReTXChintu/trippin/commit/a2a45ecafd2064e25cbc90f612da61e7623b3772))
* full-width "New trip" page with a live trip preview ([994d39e](https://github-personal/ReTXChintu/trippin/commit/994d39eb4bbccd9ee77d5892dc5ed8134cbf85af))
* Google Maps strictly per user — no shared server key ([c3ea6c5](https://github-personal/ReTXChintu/trippin/commit/c3ea6c50dc6076367aa55265ac596b2f74ac2222))
* itinerary PDF that looks like the app ([762434b](https://github-personal/ReTXChintu/trippin/commit/762434b7f25695256d02f5a4c082b92e505b741b))
* offline trip bundle for the mobile app ([bbbe019](https://github-personal/ReTXChintu/trippin/commit/bbbe019baadf6aa6a654d8ab3f7b375fd9486ef3))
* optimize route, day warnings, easier trip editing ([5995f74](https://github-personal/ReTXChintu/trippin/commit/5995f7419d31db2aaec379693f7fcc47e7f896f4))
* own Google Maps key per user, setup guide, usage and cost in the app ([4f0506c](https://github-personal/ReTXChintu/trippin/commit/4f0506cb266ae974bd4f343588ad66705a86dd20))
* phase 3 — bookings, budget & expenses, checklist, weather ([68304ad](https://github-personal/ReTXChintu/trippin/commit/68304adbbfa308d57d48e040d74b89ac0b18b3d1))
* phase 4 — whole-trip map and map-based place discovery ([25f5fe4](https://github-personal/ReTXChintu/trippin/commit/25f5fe450f33fcf398399c1e2df4a9dc2a5a10fd))
* phase 5 — on-trip Today view, calendar export, offline app ([0cb6296](https://github-personal/ReTXChintu/trippin/commit/0cb6296740d131f08ec226f15a4e0f1471b08634))
* phase 6 — roles, invite links, votes and comments ([28d23d3](https://github-personal/ReTXChintu/trippin/commit/28d23d3663805087f87779d5010266d1edb7d1c2))
* phase 7 — AI trip from a sentence, ask AI to change the plan, shared keys ([22736f9](https://github-personal/ReTXChintu/trippin/commit/22736f9bab1826ddfc8dab2d3dd5a0a54fc02095))
* phase 8 — simpler "New trip" page ([b6b07b0](https://github-personal/ReTXChintu/trippin/commit/b6b07b0101e8964b462c60e026515f3bd7456517))
* pick places per day trip; search stays near the area ([e2e7c05](https://github-personal/ReTXChintu/trippin/commit/e2e7c05ff279562a74c1d3c695ea5c64e105a1dd))
* public invite page, people and plan progress on trip cards ([9f72362](https://github-personal/ReTXChintu/trippin/commit/9f72362b0b3614fff8c22e50e2ee1f9e94ff0e52))
* release pipeline builds the Android app; in-app updates ([85da970](https://github-personal/ReTXChintu/trippin/commit/85da970762a4db3feaf5f062e837dd14d7520819))
* special instructions for the AI plan ([49d744f](https://github-personal/ReTXChintu/trippin/commit/49d744f6d64d8389f15064e88d659204e92dd41e))
* Trippin mobile — the offline travel companion ([fb2e37f](https://github-personal/ReTXChintu/trippin/commit/fb2e37ff43bf676ae7840e874718ddad00314d09))
* trustworthy scheduling, stays & restaurants, redesigned trip page ([ef89cd2](https://github-personal/ReTXChintu/trippin/commit/ef89cd2622514fa5adb2aac060e70e43a347448a))

All notable changes to this project will be documented in this file. See [Conventional Commits](https://www.conventionalcommits.org/) for commit message format.
