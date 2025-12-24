# Store Lesson Skill

## Overview

Manual lesson storage with structured tagging for Heimdall persistent memory. Use to capture insights, patterns, solutions, and decisions that should persist across sessions.

## Usage

```bash
/memory store "Lesson content here"
/memory lesson "Pattern discovered: always validate input before processing"
```

## Core Commands

### Store a Lesson
```bash
# Basic lesson storage
aes-bizzy memory store "Lesson content" --type lesson

# With explicit tags
aes-bizzy memory store "Content" --type lesson --tags "tech:typescript,pattern:error-handling"

# With TTL (expiration)
aes-bizzy memory store "Temporary context" --type context --ttl 7
```

### Memory Types

| Type | Use For | Example |
|------|---------|---------|
| `lesson` | Learnings and insights | "Always use async/await over .then() for readability" |
| `pattern` | Reusable solutions | "Retry pattern with exponential backoff for API calls" |
| `decision` | Architectural choices | "Chose PostgreSQL over MongoDB for relational data needs" |
| `error` | Error resolutions | "Fixed by updating node_modules after package.json change" |
| `context` | Project context | "Project uses monorepo with Turborepo" |
| `snippet` | Code snippets | "Auth middleware implementation: ..." |
| `reference` | External resources | "Documentation at https://..." |

### Tag Categories

Use structured tags for better retrieval:

```bash
# Agent context
--tags "agent:frontend-dev"
--tags "agent:pm-lead"

# Project scope
--tags "project:my-webapp"
--tags "project:api-gateway"

# Task reference
--tags "task:15"
--tags "task:15.2"

# Technology stack
--tags "tech:react,tech:typescript"
--tags "tech:python,tech:fastapi"

# Component/Feature
--tags "component:auth"
--tags "feature:user-registration"

# Error types
--tags "error:TypeError"
--tags "error:ImportError"

# Pattern types
--tags "pattern:singleton"
--tags "pattern:retry-logic"
```

## Interactive Storage Flow

When storing important lessons:

```
1. Identify the insight worth preserving
2. Determine the memory type (lesson, pattern, decision, etc.)
3. Select relevant tags:
   - What project does this apply to?
   - What technologies are involved?
   - What component/feature relates?
   - Is this task-specific or general?
4. Store with appropriate metadata
5. Verify storage was successful
```

## Storage Templates

### Lesson Template
```bash
aes-bizzy memory store "
## Lesson: [Title]

**Context**: [When/where this applies]

**Insight**: [The key learning]

**Why It Matters**: [Impact of applying/ignoring this]

**Example**: [Concrete example if applicable]
" --type lesson --tags "tech:...,component:..."
```

### Pattern Template
```bash
aes-bizzy memory store "
## Pattern: [Name]

**Problem**: [What problem this solves]

**Solution**: [The pattern approach]

**Implementation**:
\`\`\`typescript
// Code example
\`\`\`

**When to Use**: [Applicable scenarios]
" --type pattern --tags "pattern:...,tech:..."
```

### Decision Template
```bash
aes-bizzy memory store "
## Decision: [Title]

**Context**: [Situation requiring decision]

**Options Considered**:
1. Option A - [pros/cons]
2. Option B - [pros/cons]

**Decision**: [What was chosen]

**Rationale**: [Why this choice]

**Implications**: [What this means going forward]
" --type decision --tags "project:...,component:..."
```

### Error Resolution Template
```bash
aes-bizzy memory store "
## Error: [Error Type/Message]

**Symptoms**: [What was observed]

**Root Cause**: [What caused it]

**Resolution**: [How it was fixed]

**Prevention**: [How to avoid in future]
" --type error --tags "error:...,tech:..."
```

## Best Practices

1. **Be Concise but Complete**: Include enough context for future understanding
2. **Use Descriptive Tags**: Future retrieval depends on good tagging
3. **Include Examples**: Concrete examples improve usefulness
4. **Cross-Reference**: Link to related tasks/files when relevant
5. **Set TTL for Temporary Context**: Use TTL for session-specific info
6. **Avoid Duplication**: Search before storing to avoid duplicates

## Automatic vs Manual Storage

### Automatic (via Hooks)
These are captured automatically by Heimdall hooks:
- Task completions (post_task_complete.py)
- Git commits (post_commit.py)
- Error resolutions (error_resolved.py)
- Session summaries (session_end.py)
- PRD parsing (prd_parsed.py)

### Manual (via This Skill)
Use manual storage for:
- Insights not captured by hooks
- Cross-project patterns
- Design rationale and decisions
- Curated lessons from research
- Important external references

## Cross-References

- **recall-similar.md**: Retrieve stored memories
- **search-memory.md**: Find specific memories
- **project-memory.md**: View project memory summaries
- **hooks/heimdall/**: Automatic memory storage hooks

## MCP Tool Mapping

This skill uses the Heimdall MCP server tools:
- `heimdall_store_memory` - Store new memories
- `heimdall_get_memories` - Verify storage
