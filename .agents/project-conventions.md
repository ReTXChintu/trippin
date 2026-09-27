# Project Conventions Reference

Quick lookup for project-specific patterns, tools, and commands.

## Frontend Project (`apps/frontend/`)

### Technology Stack

- Framework: React 19 + Vite
- Language: TypeScript (strict mode)
- UI: Chakra UI v2
- Data fetching: axios + @tanstack/react-query
- Routing: react-router-dom
- Package Manager: npm

### Configuration Files

- `apps/frontend/package.json` - Dependencies, scripts
- `apps/frontend/tsconfig.app.json` - TypeScript configuration (`@/*` path alias)
- `apps/frontend/vite.config.ts` - Vite config
- `.env.example` (repo root) - Env vars (`VITE_API_BASE_URL`, etc.); read via `envDir` in `vite.config.ts`

### Project Structure

```
apps/frontend/src/
  App.tsx        → Router setup
  pages/         → Route-level page components
  layouts/       → AuthLayout, DashboardLayout
  routes/        → RequireAuth, RedirectIfAuthed guards
  components/    → Shared UI (layout/, trips/, ui/)
  modules/       → Feature modules (api/, hooks/, components/, types/)
  store/         → Zustand state (authStore, tripStore, itineraryStore)
  lib/           → axios instance, theme, misc utilities
```

### Common Commands

- `npm run dev -w apps/frontend` - Development server (port 5173)
- `npm run build -w apps/frontend` - Production build
- `npm run lint -w apps/frontend` - oxlint

### Conventions

- ✅ Use TypeScript for all new files
- ✅ Components in PascalCase
- ✅ Data fetching via React Query hooks in `modules/*/hooks/`, never raw fetch in components
- ✅ Auth state lives in `store/authStore.ts`; auth guards are `<RequireAuth />` / `<RedirectIfAuthed />`

---

## Backend Project (`apps/backend/`)

### Technology Stack

- Framework: Express
- Language: TypeScript (strict mode, ESM)
- DB: MongoDB via Mongoose
- Auth: JWT (jose) — Bearer header (mobile) or httpOnly cookie (web), same token
- Package Manager: npm

### Configuration Files

- `apps/backend/package.json` - Dependencies, scripts
- `apps/backend/tsconfig.json` - TypeScript configuration (`@/*` path alias)
- `.env.example` (repo root) - Env vars (`MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, etc.); loaded by `src/lib/load-env.ts`

### Project Structure

```
apps/backend/src/
  index.ts        → Express app bootstrap, route mounting
  middleware/      → auth.middleware.ts (Bearer or cookie JWT check)
  models/          → Mongoose schemas
  repositories/    → Data-access layer wrapping models
  services/        → Cross-cutting services (email, nlp)
  lib/             → jwt.ts, mongodb.ts, response.ts, ai.ts, places.ts
  modules/         → Feature modules (controllers/, routes/, services/, validators/)
```

### Common Commands

- `npm run dev -w apps/backend` - Dev server via tsx watch (port 4000)
- `npm run build -w apps/backend` - tsc build to dist/
- `npm run lint -w apps/backend` - ESLint

### Conventions

- ✅ Every route: `router.ts` (wires paths to controller) → `controller.ts` (req/res, calls service) → `service.ts` (business logic, pure of req/res)
- ✅ Response shape is always `{ success: true, data }` or `{ success: false, error }` — use helpers in `lib/response.ts` (`sendOk`, `sendError`, `sendResult`)
- ✅ Auth: `req.user` is set by `authMiddleware`; never re-derive the user id another way
- ✅ Port 4000 must not change — the mobile app's `API_BASE_URL` is hardcoded to it

---

## Mobile Project (`apps/mobile-app/`)

### Technology Stack

- Framework: Flutter
- Language: Dart
- Platforms: Android (Gradle), iOS (Xcode), Web, Linux, macOS, Windows
- Package Manager: pub (dart pub)

### Configuration Files

- `apps/mobile-app/pubspec.yaml` - Dependencies, project config
- `apps/mobile-app/analysis_options.yaml` - Dart analyzer rules
- `apps/mobile-app/android/build.gradle.kts` - Android build config
- `apps/mobile-app/ios/Runner.xcodeproj` - iOS project
- `apps/mobile-app/README.md` - Project docs

### Project Structure

```
apps/mobile-app/lib/
  main.dart       → Entry point
  core/           → Core business logic (api client, config)
  features/       → Feature modules

apps/mobile-app/android/  → Android native code
apps/mobile-app/ios/      → iOS native code
```

### Common Commands

- `flutter run` - Run app
- `flutter run -d web` - Run web version
- `dart pub get` - Fetch dependencies
- `flutter pub add [package]` - Add dependency
- `flutter analyze` - Run static analysis
- `flutter test` - Run tests

### Conventions

- ✅ Use Dart static typing throughout
- ✅ Classes in PascalCase
- ✅ Functions/variables in camelCase
- ✅ Follow analysis_options.yaml lint rules
- ✅ Talks only to `apps/backend`'s `/api/v1` REST API — never assume shared code with frontend

### Platform-Specific Notes

- Android: Gradle build system, API levels in android/
- iOS: CocoaPods for dependencies, Xcode project config
- Windows: cross-drive builds (project vs pub cache) can break Kotlin incremental compilation — `kotlin.incremental=false` is already set in `android/gradle.properties`

---

## Build & Release Scripts

- Root `scripts/sync-all-versions.js` - Propagates a version bump (via root `release-it`) to all three apps' `package.json` + mobile's `pubspec.yaml`
- `apps/mobile-app/scripts/sync-pubspec-version.js` - Bumps pubspec.yaml's build number to match `package.json`'s version
- `apps/mobile-app/scripts/copy-apk.js` - Copies the built APK into `apps/mobile-app/dist/` after release

Versioning is controlled from the **root** only (`npm run release:patch|minor|major` from repo root) — do not run release-it from inside an individual app.

---

## Shared Resources

Located in: `files/`

- `brand_guidelines.md` - Branding and design system
- Use for: UI consistency, color schemes, naming conventions

---

## When to Check Specific Files

| Question              | Check                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Dependency available?  | pubspec.yaml (mobile) or package.json (frontend/backend)             |
| How to run project?    | Root README.md, or README.md in `apps/mobile-app/`                    |
| Build failing?         | build.gradle.kts (android) or specific platform dir                   |
| Lint errors?           | analysis_options.yaml (mobile) or eslint config (frontend/backend)    |
| TypeScript errors?     | tsconfig.json / tsconfig.app.json                                      |
| Version info?         | root package.json (all 3 apps share this version)                     |
| Branding rules?        | files/brand_guidelines.md                                             |

---

## Decision Trees

### Should I read apps/frontend/X.tsx, apps/backend/X.ts, or apps/mobile-app/lib/X.dart?

→ Check the file path in error/request
→ If ambiguous, check imports/context from user

### Is this a TypeScript or Dart question?

→ TypeScript → frontend or backend project
→ Dart → mobile project
→ Both → treat separately, don't mix patterns

### When should I use frontend, backend, or mobile code style?

→ Working in apps/frontend/ → use frontend conventions
→ Working in apps/backend/ → use backend conventions
→ Working in apps/mobile-app/ → use mobile conventions
→ Never use patterns across projects unless explicitly building a cross-project feature

---

Use this reference to make fast decisions and avoid context misunderstandings.
