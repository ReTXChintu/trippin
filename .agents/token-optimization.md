# Token Optimization Guidelines

Every byte counts. These rules minimize token waste and keep responses efficient.

## Response Length Rules

### 1. No Unnecessary Framing

❌ **AVOID:**

```
"I'll help you with that. Let me first analyze the situation. As I examine
the code, I can see that... The result is that... Here's what I found..."
```

✅ **DO:**

```
[perform action]
Result: [direct answer]
```

### 2. Answer the Question, Nothing More

❌ **AVOID:**

```
"This is an interesting question. Let me explain the history of this pattern,
then describe how it works in general, then show you how it applies here..."
```

✅ **DO:**

```
[exact answer user asked for]
```

### 3. No Explanations Unless Asked

❌ **AVOID:**

```
I made three changes to fix this:
1. First, I updated the import statement because...
2. Then, I changed the component logic because...
3. Finally, I added error handling because...
```

✅ **DO:**

```
Fixed in [file.ts](file.ts#L10-L15)
```

### 4. Combine Operations

❌ **AVOID:**

```
[Read file 1]
[Report findings]
[Read file 2]
[Report findings]
[Make change 1]
[Explain change 1]
[Make change 2]
[Explain change 2]
```

✅ **DO:**

```
[Read files 1 & 2 in parallel]
[Make changes 1 & 2 with multi_replace_string_in_file]
[One sentence: "Fixed in X and Y"]
```

## Context Efficiency

### Before Reading Files

- Check workspace structure (already in context)
- Use semantic_search first (broader pattern matching)
- Use grep_search for specific identifiers
- Read only necessary files

### When Exploring Code

- Don't explain every line you read
- Extract insights, not documentation
- Store findings in session memory
- Reference memory next time instead of re-exploring

### Working with Search Results

- If semantic_search returns full file contents, use it (don't read again)
- Summarize findings in 1-2 lines
- Jump to implementation, skip narrative

## Token Usage by Task Type

| Task             | Target      | Method                          |
| ---------------- | ----------- | ------------------------------- |
| Single file edit | < 2K tokens | Read file, edit, confirm        |
| Multi-file edit  | < 3K tokens | Read all, batch edits, confirm  |
| Feature impl     | < 8K tokens | Fast context → implement → test |
| Investigation    | < 5K tokens | Search → find → report          |
| Design review    | < 4K tokens | Read key files → feedback       |
| Debug issue      | < 6K tokens | Find error → test → fix         |

## Conversation Management

### When Starting New Task

- Check memory for related context
- Don't re-explain previous work
- Reference past decisions by link/location, not summary

### When Context Grows Large

- Save progress to `/memories/session/`
- Mark completed work
- Start fresh context for next task
- Reference memory: "Per session notes, X was completed"

### When Switching Projects

- Clear out full-file reads from previous project
- Read only configuration of new project
- Don't compare patterns across projects unnecessarily

## Output Format Optimization

### File References

✅ Link once: [path/file.ts](path/file.ts#L10)
❌ Repeated: "In file X at line Y, in file Z at line Q, also in file A..."

### Code Snippets

✅ Show only changed section (3 lines context)
❌ Show full function/file

### Results

✅ "Done" / "Fixed" / "Added"
❌ "I have successfully completed the implementation which involved..."

### Lists

✅ Bullet format for < 5 items
❌ Narrative for everything

## When to Break These Rules

**Explain only when:**

- User explicitly asks "why" or "explain"
- Fixing subtle/non-obvious bug requiring understanding
- Architectural decision needs context

**Don't combine operations when:**

- Commands have dependencies (wait for previous result)
- Output affects next decision
- Complex conditional logic needed

**Do add context when:**

- Task involves cross-project decisions
- Multiple approaches exist and trade-offs matter
- User is learning (not just task execution)

---

Apply these rules to every response. Optimize ruthlessly.
