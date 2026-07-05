# Fast Context Pickup

Help agents understand workspace state quickly without excessive file reading.

## Pattern Recognition

### Frontend Project Indicators

```
- apps/frontend/package.json exists → React 19 + Vite project
- apps/frontend/tsconfig.app.json exists → TypeScript strict mode
- apps/frontend/vite.config.ts exists → Vite build config
- apps/frontend/src/App.tsx exists → react-router-dom routing
```

### Backend Project Indicators

```
- apps/backend/package.json exists → Express + Mongoose project
- apps/backend/tsconfig.json exists → TypeScript strict mode, ESM
- apps/backend/src/index.ts exists → Express app entrypoint
```

### Mobile Project Indicators

```
- apps/mobile-app/pubspec.yaml exists → Flutter/Dart project
- apps/mobile-app/android/ + apps/mobile-app/ios/ → Cross-platform native targets
- apps/mobile-app/analysis_options.yaml exists → Dart linter configured
- apps/mobile-app/lib/main.dart exists → Entry point structure known
```

## Context Assumptions

**Always safe to assume:**

- All three apps are independent (don't share code directly)
- Frontend and backend use TypeScript, mobile uses Dart static typing
- Monorepo root is decision point (apps/frontend/ vs apps/backend/ vs apps/mobile-app/ split)
- Configuration files are source of truth (pubspec.yaml, package.json, tsconfig.json)

**Never assume:**

- Dependency versions match documentation
- Patterns from frontend apply to backend or mobile (or vice versa)
- Build/run commands are standard (check package.json/pubspec.yaml first)

## Fast File Reads Strategy

### For Frontend Tasks

1. Read `apps/frontend/package.json` (dependencies, scripts)
2. Read target file directly (don't explore everything)
3. If TypeScript errors, check `apps/frontend/tsconfig.app.json`

### For Backend Tasks

1. Read `apps/backend/package.json` (dependencies, scripts)
2. Read target file directly (don't explore everything)
3. If TypeScript errors, check `apps/backend/tsconfig.json`

### For Mobile Tasks

1. Read `apps/mobile-app/pubspec.yaml` (dependencies, versions)
2. Read target file directly in `apps/mobile-app/lib/`
3. If lint errors, check `apps/mobile-app/analysis_options.yaml`
4. If build issues, check `apps/mobile-app/android/build.gradle.kts` or `apps/mobile-app/ios/`

### For General Questions

1. Check workspace structure (provided in context)
2. Use semantic_search for code patterns (not file reads)
3. Use grep_search for specific strings/identifiers
4. Read only files referenced by search results

## State Tracking

**Current session state** (stored in `/memories/session/`):

- Active project focus (web or mobile)
- Recent changes made
- Known issues being resolved
- Build/test status

**Persistent knowledge** (stored in `/memories/repo/`):

- Project conventions discovered
- Common command patterns
- Build configurations
- Verified practices for this codebase

**Always check memory before:**

- Starting new investigation
- Running build/test commands
- Making architectural decisions

## Context Size Management

**Lightweight context (< 5K tokens):**

- Single file analysis
- Specific function/component help
- Configuration lookup

**Medium context (5-15K tokens):**

- Multiple files in same project
- Feature implementation across layers
- Dependency analysis

**Heavy context (15-30K tokens):**

- Full feature implementation across both projects
- Monorepo restructuring
- Major dependency updates

**When exceeding 30K tokens on a task:**

- Split into subtasks
- Complete one, commit to memory, start fresh
- Reference memory instead of re-reading
- Reduce exploration scope

---

Apply these patterns to answer questions fast and keep token usage minimal.
