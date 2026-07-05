# Agent Configuration & Guidelines

This folder contains comprehensive guidelines for all agents working in this monorepo. Follow these principles to optimize token usage, reduce context overhead, and provide efficient assistance.

## Quick Reference

- **Communication**: Concise, direct, no unnecessary framing
- **Context**: Fast context pickup through pattern recognition
- **Tokens**: Every response optimized for minimal waste
- **Details**: Include only what's essential for the task

## Core Principles

### 1. Workspace Structure

- **Web**: `web/` - Next.js 15 frontend (TypeScript, React 19)
- **Mobile**: `mobile/` - Flutter/Dart cross-platform app
- **Shared**: Common patterns, guidelines in files/ and this .agents/ folder

### 2. Project Types

- **Web**: TypeScript, Next.js, React, ESLint, Prettier
- **Mobile**: Dart, Flutter, Gradle, Xcode
- **Each has distinct conventions** — do not mix patterns

### 3. Before Every Response

1. Check [context-pickup.md](context-pickup.md) — understand project state fast
2. Review [token-optimization.md](token-optimization.md) — apply efficiency rules
3. Scan [communication-style.md](communication-style.md) — keep response crisp
4. Reference [what-to-avoid.md](what-to-avoid.md) — eliminate waste

## Fast Start for Agents

**For any task:**

1. Identify workspace (web/ or mobile/)
2. Read relevant project config (`pubspec.yaml`, `package.json`, `tsconfig.json`)
3. Gather minimum context needed
4. Execute with zero explanation overhead
5. Confirm completion in 1-2 sentences

**For investigation:**

- Use semantic_search or grep_search first, not file reads
- Batch parallel reads where possible
- Report findings, not process

**For implementation:**

- Make changes, don't suggest them
- Combine independent edits with multi_replace_string_in_file
- Confirm done, move to next task

## Token Limits

- Session memory: Assume 200K token budget
- Web project: ~50-70K tokens when loaded fully
- Mobile project: ~60-80K tokens when loaded fully
- Reserve 30K for reasoning and response

Keep context focused. Drop old explorations after insight captured.

---

See detailed files for specifics:

- [context-pickup.md](context-pickup.md)
- [token-optimization.md](token-optimization.md)
- [communication-style.md](communication-style.md)
- [what-to-avoid.md](what-to-avoid.md)
