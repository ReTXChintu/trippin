# Itinerary Planner — Mobile

Flutter client for the Itinerary Planner REST API.

## Prerequisites

Run the backend API (the web repo) and note its base URL, e.g. `http://localhost:4000/api/v1`. On Android emulator use `http://10.0.2.2:4000/api/v1`; on a physical device use your machine's LAN IP.

## Setup

```bash
flutter pub get
cp .env.example .env
# Edit .env — set API_BASE_URL for your environment
```

| Environment | Example `API_BASE_URL` |
|-------------|------------------------|
| Android emulator | `http://10.0.2.2:4000/api/v1` |
| Physical device | `http://<your-lan-ip>:4000/api/v1` |

## Run

```bash
flutter run
```

## Build

```bash
flutter analyze
flutter build apk
```

## Android (Windows)

If the project lives on a different drive than the Flutter pub cache (`C:` vs `D:`), Kotlin incremental compilation may fail. This repo sets `kotlin.incremental=false` in `android/gradle.properties`. If builds still fail, run `flutter clean` and retry.
