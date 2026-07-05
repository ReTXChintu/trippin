# Agent Pre-Response Checklist

Use this before finalizing any response to ensure token efficiency and quality.

## Context & Understanding

- [ ] Identified correct workspace (web/ or mobile/)
- [ ] Checked relevant configuration files first (package.json/pubspec.yaml/tsconfig.json)
- [ ] Did NOT explore unnecessarily (searched before reading files)
- [ ] Consulted `/memories/` to avoid re-exploring past work

## Research Efficiency

- [ ] Used semantic_search or grep_search instead of file reads where applicable
- [ ] Combined independent reads into parallel operations
- [ ] Stopped exploring once sufficient context gathered (< 5K tokens)
- [ ] Did NOT read entire files when only specific sections needed

## Response Quality

- [ ] Response starts with the answer, not process narrative
- [ ] Removed all preamble ("I'll help you...", "Great question!")
- [ ] Removed all closing remarks ("Let me know if...", "Feel free to ask...")
- [ ] Removed all hedging language ("might", "could", "think", "perhaps")
- [ ] No unnecessary explanations (explained only if asked or non-obvious)

## Implementation (If Making Changes)

- [ ] Combined independent edits using multi_replace_string_in_file (not sequential)
- [ ] Changes are minimal and focused on the task
- [ ] Only necessary files modified (no cleanup/reformatting unless requested)
- [ ] Confirmed changes are correct before reporting completion

## Token Optimization

- [ ] Response length appropriate for question complexity
- [ ] No repeated information from earlier in conversation
- [ ] No generic phrases that add no value
- [ ] File references are proper markdown links with line numbers
- [ ] Code snippets show only changed sections (3 lines context max)
- [ ] Lists used sparingly (only for parallel items, not narrative)

## Format Verification

- [ ] File links follow format: [path/file.ts](path/file.ts#L10)
- [ ] Code diff format is clear and minimal
- [ ] No unnecessary emoji or decorative characters
- [ ] Proper markdown headings (only when needed)
- [ ] Technical terminology is precise and consistent

## Final Check

- [ ] Could I remove 20% of words without losing meaning?
- [ ] Is every sentence providing value to the task?
- [ ] Did I assume project knowledge instead of explaining obvious?
- [ ] Is the tone professional/neutral (not chatty)?

---

## Response Length Audit

Quick token estimate:

- Introduction/closing remarks: ❌ DELETE if > 10 tokens
- Process narrative: ❌ DELETE if > 20 tokens
- Unnecessary detail: ❌ DELETE if not directly answering question
- Repeated info: ❌ DELETE completely
- Generic phrases: ❌ DELETE (examples: "I think", "basically", "actually", "so")

**Red flags for over-explanation:**

- Response > 500 words for simple task
- Multiple paragraphs for code change
- Generic closing remarks present
- More than 3 separate explanations offered

---

## When to Break the Rules

Allow exceptions for these cases only:

- User explicitly asks "why" or "explain"
- Debugging requires understanding subtle behavior
- Architectural trade-offs need context
- User is learning (not production task execution)
- Security/safety implications need explanation

Even in these cases, still be concise.

---

## Common Token Wasters (Remove These)

```
"I'd be happy to help"
"That's a great question"
"Let me analyze this..."
"Thank you for asking"
"I hope this helps"
"Feel free to reach out"
"Let me know if you need anything else"
"As I mentioned earlier"
"In my opinion"
"I think this might work"
"Essentially" / "basically" / "actually"
"The reason is because"
"In conclusion"
"To summarize"
```

Each one 5-15 tokens. Remove them all.

---

## Use This Checklist

✅ Before sending every response
✅ Especially before:

- Complex implementations
- Multi-file changes
- Investigation/research tasks
- Questions requiring explanation

Quick version (5 seconds):

1. Does my response answer the question directly?
2. Did I remove intro/closing remarks?
3. Are operations combined efficiently?
4. Is any explanation not asked for?
5. Can I delete 20% of words?

If "no" to any: Edit before sending.

---

**Remember:** Token efficiency is professionalism. Choppy beats chatty.
