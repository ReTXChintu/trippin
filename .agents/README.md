# .agents/ Folder Guide

This folder contains comprehensive guidelines to optimize how agents work in this monorepo. Every agent should reference these files before responding.

## Quick Navigation

**Start here:**

- [AGENTS.md](AGENTS.md) — Overview and core principles

**Before answering:**

1. [context-pickup.md](context-pickup.md) — Understand workspace fast
2. [token-optimization.md](token-optimization.md) — Keep responses efficient
3. [communication-style.md](communication-style.md) — Write concisely

**During implementation:**

- [what-to-avoid.md](what-to-avoid.md) — Common token waste patterns
- [project-conventions.md](project-conventions.md) — Web vs Mobile differences
- [pre-response-checklist.md](pre-response-checklist.md) — Verify before sending

## File Descriptions

| File                          | Purpose                                            | When to Use                    |
| ----------------------------- | -------------------------------------------------- | ------------------------------ |
| **AGENTS.md**                 | Core principles, workspace structure, token limits | Every time—start here          |
| **context-pickup.md**         | Fast context recognition without over-reading      | Before investigating anything  |
| **token-optimization.md**     | Response length rules and efficiency patterns      | Before writing response        |
| **communication-style.md**    | How to write direct, professional responses        | Before writing response        |
| **what-to-avoid.md**          | Patterns that waste tokens or reduce clarity       | During implementation/review   |
| **project-conventions.md**    | Web/Mobile tech stacks, commands, structure        | When working in either project |
| **pre-response-checklist.md** | Verification before sending response               | Before finalizing response     |

## For Different Agent Types

### Investigation Agents

1. Read [context-pickup.md](context-pickup.md) - Know what to look for
2. Use semantic_search or grep_search first
3. Read only necessary files
4. Check [what-to-avoid.md](what-to-avoid.md) - Don't over-explore
5. Reference [pre-response-checklist.md](pre-response-checklist.md) - Don't over-report

### Implementation Agents

1. Read [project-conventions.md](project-conventions.md) - Know the tech stack
2. Check [context-pickup.md](context-pickup.md) - Understand project state
3. Make changes directly (don't suggest)
4. Combine operations efficiently
5. Use [pre-response-checklist.md](pre-response-checklist.md) - Verify changes

### Question-Answering Agents

1. Read [communication-style.md](communication-style.md) - Be direct
2. Use [token-optimization.md](token-optimization.md) - No unnecessary explanation
3. Reference [what-to-avoid.md](what-to-avoid.md) - Eliminate waste
4. Verify with [pre-response-checklist.md](pre-response-checklist.md)

## Key Principles Summary

### 🎯 Do This

- Answer first, explain if asked
- Combine operations efficiently
- Check memory for past context
- Reference specific lines with links
- Be direct and professional

### ❌ Never Do This

- Start with process narrative
- Make changes sequentially when parallel is possible
- Re-read files just loaded
- Use generic pleasantries
- Over-explain obvious changes

### 📊 Token Targets

- Single file edit: < 2K tokens total
- Multi-file edit: < 3K tokens total
- Investigation: < 5K tokens total
- Question: < 1K tokens total
- Feature implementation: < 8K tokens total

### 🧠 Context Management

- Web project full context: ~50-70K tokens
- Mobile project full context: ~60-80K tokens
- Reserve 30K tokens for reasoning/response
- Save progress to memory before big tasks
- Reference memory instead of re-exploring

## Integration with Workspace

These guidelines apply to:

- ✅ All agents working on this monorepo
- ✅ Both web/ and mobile/ projects
- ✅ Any implementation or investigation task
- ✅ Every response generated

These guidelines do NOT:

- ❌ Override user's explicit requests
- ❌ Apply to non-coding tasks
- ❌ Restrict helpful explanation when clearly needed

## Using Alongside .instructions.md

If both `.agents/` guidelines and `.instructions.md` (or similar) exist:

- `.instructions.md` = User preferences (highest priority)
- `.agents/` = General best practices
- Apply both: follow instructions, optimize with agents guidelines

## Updating These Guidelines

When discovering better patterns:

1. Add to appropriate file in `.agents/`
2. Update [AGENTS.md](AGENTS.md) if adding new principle
3. Reference in `/memories/repo/` for team awareness
4. Document why the change improves token efficiency

---

**Start with [AGENTS.md](AGENTS.md). Everything else follows from there.**
