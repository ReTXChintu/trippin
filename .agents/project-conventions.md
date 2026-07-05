# Project Conventions Reference

Quick lookup for project-specific patterns, tools, and commands.

## Web Project (`web/`)

### Technology Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict mode)
- UI: React 19
- Styling: [check web/src for convention]
- Package Manager: npm/yarn

### Configuration Files

- `web/package.json` - Dependencies, scripts
- `web/tsconfig.json` - TypeScript configuration
- `web/eslint.config.mjs` - ESLint rules
- `web/next.config.ts` - Next.js config
- `web/README.md` - Project docs

### Project Structure

```
web/src/
  app/          → Next.js routes
  components/   → React components
  modules/      → Feature modules
  lib/          → Utilities
  types/        → TypeScript types
  services/     → API/external services
  store/        → State management (if used)
```

### Common Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)

### Conventions

- ✅ Use TypeScript for all new files
- ✅ Components in PascalCase
- ✅ Utilities in camelCase
- ✅ Follow ESLint config rules
- ✅ Use App Router patterns (not Pages Router)

### Key Deprecations (Next.js 15)

- Pages Router (use App Router)
- API Routes structure (new format)
- Image component changes
- Check `node_modules/next/dist/docs/` for details

---

## Mobile Project (`mobile/`)

### Technology Stack

- Framework: Flutter
- Language: Dart
- Platforms: Android (Gradle), iOS (Xcode), Web, Linux, macOS, Windows
- Package Manager: pub (dart pub)

### Configuration Files

- `mobile/pubspec.yaml` - Dependencies, project config
- `mobile/analysis_options.yaml` - Dart analyzer rules
- `mobile/android/build.gradle.kts` - Android build config
- `mobile/ios/Runner.xcodeproj` - iOS project
- `mobile/README.md` - Project docs

### Project Structure

```
mobile/lib/
  main.dart       → Entry point
  core/           → Core business logic
  features/       → Feature modules
  shared/         → Shared code

mobile/android/  → Android native code
mobile/ios/      → iOS native code
mobile/web/      → Web compilation
mobile/linux/    → Linux native
mobile/macos/    → macOS native
mobile/windows/  → Windows native
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
- ✅ Use meaningful error handling (not silent failures)

### Platform-Specific Notes

- Android: Gradle build system, API levels in android/
- iOS: CocoaPods for dependencies, Xcode project config
- Web: Flutter web compilation (check flutter/web/)
- Linux/macOS/Windows: Native build tools required

---

## Build & Deployment Scripts

Located in: `mobile/scripts/` and `web/scripts/`

- `release.js` - Prepare release versions
- `sync-pubspec-version.js` - Sync version numbers
- `copy-apk.js` - Copy APK after build (Android)

Check script headers for usage instructions.

---

## Shared Resources

Located in: `files/`

- `brand_guidelines.md` - Branding and design system
- Use for: UI consistency, color schemes, naming conventions

---

## When to Check Specific Files

| Question              | Check                                                     |
| --------------------- | --------------------------------------------------------- |
| Dependency available? | pubspec.yaml (mobile) or package.json (web)               |
| How to run project?   | README.md in project root                                 |
| Build failing?        | build.gradle.kts (android) or specific platform dir       |
| Lint errors?          | analysis_options.yaml (mobile) or eslint.config.mjs (web) |
| TypeScript errors?    | tsconfig.json (web only)                                  |
| Version info?         | package.json/pubspec.yaml first line                      |
| Branding rules?       | files/brand_guidelines.md                                 |

---

## Fast Command Reference

### Web (Next.js)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Check code quality
npm test             # Run tests
```

### Mobile (Flutter)

```bash
flutter pub get      # Get dependencies
flutter run          # Run on connected device/emulator
flutter run -d web   # Run web version
flutter analyze      # Lint check
flutter test         # Run tests
flutter build apk    # Build Android APK
flutter build ios    # Build iOS app
```

---

## Decision Trees

### Should I read web/X.ts or mobile/lib/X.dart?

→ Check the file path in error/request
→ If ambiguous, check imports/context from user

### Is this a TypeScript or Dart question?

→ TypeScript → web project
→ Dart → mobile project
→ Both → treat separately, don't mix patterns

### When should I use web code style vs mobile?

→ Working in web/ → use web conventions
→ Working in mobile/ → use mobile conventions
→ Never use patterns across projects unless explicitly building cross-project feature

---

Use this reference to make fast decisions and avoid context misunderstandings.
