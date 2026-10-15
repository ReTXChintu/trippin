# Trippin — mobile companion

Planning happens on the Trippin website. This Flutter app carries saved trips so they work **with no
internet**: the day-by-day plan, offline maps, GPS/compass navigation to each stop, reminders, and
safety info.

## What it does

- **Save a trip for offline** — one download (`GET /trips/:id/offline-bundle`) holds the plan, places
  (address, hours, entry fee, tips), each day's road route, weather, stays and bookings, the
  checklist, nearby hospitals / police / pharmacies, and local emergency numbers. Map tiles are saved
  along each day's route and around every stop (zoom 13–16), plus an overview (8–12).
- **Today** — the current day and the next stop, with "Take me there".
- **Navigate offline** — GPS + compass arrow to the stop, distance and walking time, the saved road
  route on a cached map, an off-route warning (> 150 m from the road), "Mark visited" on arrival, and
  a hand-off to Google Maps.
- **Take me back** to the stay, **show-the-driver** card (big text name + address), **Safety & help**
  (tap-to-call numbers, nearest hospitals/police/pharmacies with directions).
- **Done / Skip** stops — applied on the phone at once, sent to the server when back online.
- **Reminders** scheduled on the phone: "Leave in 10 min for …" and a morning plan.
- **Auto-update** — on launch / resume / pull-to-refresh, saved trips that changed on the web are
  re-downloaded (only new map tiles are fetched).
- Sign-in survives no signal and expired tokens: saved trips always open; syncing asks to sign in.

## Setup

```bash
flutter pub get
cp .env.example .env   # set API_BASE_URL / WEB_URL / MAP_TILE_URL
flutter run
```

| Setting | Example |
|---|---|
| `API_BASE_URL` | `http://187.127.179.114:50008/api/v1` (production) · emulator `http://10.0.2.2:<PORT>/api/v1` · phone on Wi-Fi `http://<pc-lan-ip>:<PORT>/api/v1` |
| `WEB_URL` | `http://187.127.179.114:50009` |
| `MAP_TILE_URL` | OpenStreetMap by default. OSM's servers only allow light use — for many users, switch to a provider that permits offline saving (e.g. MapTiler `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=…`). |

## Build & check

```bash
flutter analyze
flutter test                          # unit tests (geo maths)
flutter test test/screens_test.dart   # renders every screen with a real trip → build/screens/*.png
npm run build:apk                     # release APK → dist/trippin.apk
```

Release builds are signed with the debug key for now — add a release keystore before publishing.

## Android (Windows)

If the project lives on a different drive than the Flutter pub cache (`C:` vs `D:`), Kotlin
incremental compilation may fail. This repo sets `kotlin.incremental=false` in
`android/gradle.properties`. If builds still fail, run `flutter clean` and retry.
