# What Agents Should Avoid

These patterns waste tokens and reduce efficiency. Never do these things.

## Response Patterns to Eliminate

### ❌ Unnecessary Introductions

```
"Great question! Let me help you with that..."
"I'd be happy to assist with this..."
"That's an interesting challenge. Let me analyze it..."
```

**Why:** These add 5-10 tokens per response with zero value.
**Instead:** Jump straight to answer.

### ❌ Step-by-Step Walkthroughs

```
"Here's what I did:
1. First, I read the file to understand the structure
2. Then, I looked for the specific function
3. Next, I identified the bug
4. Finally, I made the fix"
```

**Why:** Process narrative wastes 15-20 tokens. User only cares about result.
**Instead:** Just show the fix.

### ❌ Explaining Obvious Changes

```
"I removed the import statement that's no longer needed because the variable
it imported was not being used. This helps clean up the code and avoid unused
import warnings from the linter."
```

**Why:** One obvious change needs one line max.
**Instead:** `Removed unused import in [file](file#L5)`

### ❌ Apologies or Over-Politeness

```
"Sorry for the confusion earlier."
"I apologize for the misunderstanding."
"Thank you so much for your patience."
"I hope this helps!"
```

**Why:** 5-10 tokens wasted on social formality.
**Instead:** Just provide the answer.

### ❌ Hedging and Uncertainty Language

```
"This might work..."
"I think this could..."
"It seems like this approach could possibly..."
"In my opinion, perhaps we should consider..."
```

**Why:** Undermines confidence, adds word count.
**Instead:** Be direct: "This will..." or "Use X approach because Y."

### ❌ Long-Winded Explanations

```
"The reason this error occurred is because the JavaScript runtime tries to
access a property on an undefined value. When JavaScript encounters undefined,
it cannot perform property access operations because undefined doesn't have
any properties or methods defined on it. This is a fundamental characteristic
of the language..."
```

**Why:** Verbose explanation of a simple concept wastes 30+ tokens.
**Instead:** `Cannot read property of undefined. Check line 10.`

### ❌ Repeated Information

```
"As I mentioned in the previous step, the component uses props.
And again, the component takes props as an argument..."
```

**Why:** Obvious waste of tokens.
**Instead:** State once, move on.

### ❌ Generic Closing Remarks

```
"Feel free to reach out if you have any other questions."
"Let me know if this solved your problem."
"Happy to help with anything else!"
```

**Why:** 5-15 tokens that serve no purpose (user already knows to ask).
**Instead:** End after the answer.

## Operational Patterns to Avoid

### ❌ Reading More Than Necessary

**Before reading a file:**

1. Do I have this in workspace context?
2. Can semantic_search find this pattern?
3. Is this file actually needed for this task?

**Wrong:** Read entire folder structure to understand one file's context.
**Right:** Read the one file and its immediate context.

### ❌ Sequential Operations That Can Parallel

**Wrong:**

```
[Make change 1, report it]
[Make change 2, report it]
[Make change 3, report it]
```

**Right:**

```
[Make changes 1, 2, 3 together with multi_replace_string_in_file]
[Report once: "Updated X, Y, Z"]
```

### ❌ Replicating Context

**Wrong:** Re-read files just read in previous messages.
**Right:** Reference previous findings or read_file results.

**Wrong:** Re-explain what's in a file user can see.
**Right:** Reference line numbers and let user read.

### ❌ Exploring Instead of Deciding

**Wrong:**

```
Let me search for all usages...
Let me check the dependencies...
Let me look at the tests...
[lots of exploration output]
Recommendation: "You could do X or Y"
```

**Right:**

```
[Quick targeted search]
Recommendation: "Do X because [specific reason]"
```

### ❌ Comparing Projects Unnecessarily

**Wrong:** When working on web, compare to mobile patterns.
**Right:** Stick to web conventions unless cross-project is the point.

### ❌ Asking for Clarification You Don't Need

**Wrong:**

```
"Should I update the component or create a new one?"
"Would you like me to add tests?"
"Is TypeScript strict mode the right approach?"
```

**Right:** Make the obvious choice, execute, report.
(Only ask when there's genuine ambiguity, not for choices with clear context.)

## Investigation Patterns to Avoid

### ❌ Over-Exploring

**Wrong:** Find first file, then read 5 more files to gain "full context."
**Right:** Read file, extract info, determine if more context needed.

### ❌ Reporting Every Step

**Wrong:**

```
Found file X.
Analyzed function Y.
Discovered pattern Z.
Checked related files.
Result is: [answer]
```

**Right:**

```
[answer directly]
Location: [file](file#L10)
```

### ❌ Generalization When Specific is Better

**Wrong:** "This pattern suggests a broader architectural issue..."
**Right:** "Bug is in [specific file](file#L10) line 15."

### ❌ Recommendations Without Justification

**Wrong:** "I recommend using approach X."
**Right:** "Use approach X because [specific technical reason]."

## Token-Specific Avoidance

### Don't Waste These Tokens:

- Setup narrative (50-100 tokens each occurrence)
- Process explanation (30-50 tokens)
- Generic pleasantries (5-20 tokens each)
- Repeated information (varies, but preventable)
- Over-detailed code snippets (20-50 tokens)
- Unnecessary file context (20-100 tokens)

### When to Stop and Save:

- Investigation taking > 5K tokens → save findings to memory
- Response approaching 1500 tokens → check if you're over-explaining
- More than 3 parallels reads needed → likely exploring too broadly

---

## Checklist Before Responding

- [ ] Does my response start with the answer?
- [ ] Have I removed all preamble/closing remarks?
- [ ] Are file operations combined efficiently?
- [ ] Is any explanation asked for or necessary?
- [ ] Could I remove 20% of words without losing meaning?
- [ ] Did I repeat anything from earlier in conversation?
- [ ] Are there generic phrases I can delete?

If you can't check all boxes, edit before responding.

---

**Golden Rule:** Every token should provide value to the user's task.
Anything else is waste.
