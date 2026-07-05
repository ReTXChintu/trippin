# Fast Context Pickup

Help agents understand workspace state quickly without excessive file reading.

## Pattern Recognition

### Web Project Indicators

```
- web/package.json exists → Next.js 15 project
- web/tsconfig.json exists → TypeScript strict mode
- web/eslint.config.mjs exists → ESLint configured
- web/src/app/ exists → App Router pattern
- web/AGENTS.md exists → Project-specific rules apply
```

### Mobile Project Indicators

```
- mobile/pubspec.yaml exists → Flutter/Dart project
- mobile/android/ + mobile/ios/ → Cross-platform native targets
- mobile/analysis_options.yaml exists → Dart linter configured
- mobile/lib/main.dart exists → Entry point structure known
```

## Context Assumptions

**Always safe to assume:**

- Both projects are independent (don't share code directly)
- Web uses TypeScript, Dart uses static typing
- Monorepo root is decision point (web/ vs mobile/ split)
- Configuration files are source of truth (pubspec.yaml, package.json, tsconfig.json)

**Never assume:**

- Dependency versions match documentation
- Patterns from web apply to mobile or vice versa
- Build/run commands are standard (check package.json/pubspec.yaml first)

## Fast File Reads Strategy

### For Web Tasks

1. Read `web/package.json` (dependencies, scripts)
2. Read target file directly (don't explore everything)
3. If TypeScript errors, check `web/tsconfig.json`
4. If style issues, check `web/eslint.config.mjs`

### For Mobile Tasks

1. Read `mobile/pubspec.yaml` (dependencies, versions)
2. Read target file directly in `mobile/lib/`
3. If lint errors, check `mobile/analysis_options.yaml`
4. If build issues, check `mobile/android/build.gradle.kts` or `mobile/ios/`

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
