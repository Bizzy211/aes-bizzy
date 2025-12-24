# Memory Recall Skill

## Overview

Semantic search for similar past solutions, patterns, and lessons from Heimdall persistent memory. Use when encountering problems or implementation tasks to leverage prior experience.

## Usage

```bash
/memory recall "authentication implementation"
/memory recall "database migration error"
/memory recall "React component patterns"
```

## Core Commands

### Quick Recall
```bash
# Semantic search for related memories
aes-bizzy memory search "your query here" --limit 10

# Search with type filter
aes-bizzy memory search "error handling" --type lesson
aes-bizzy memory search "API design" --type pattern
aes-bizzy memory search "TypeError fix" --type error
```

### Targeted Recall
```bash
# Project-specific memories
aes-bizzy memory search "authentication" --tags "project:my-app"

# Technology-specific patterns
aes-bizzy memory search "state management" --tags "tech:react,tech:typescript"

# Task-related context
aes-bizzy memory search "user registration" --tags "task:15"
```

### Token-Optimized Recall
```bash
# Compact output for tight token budgets
aes-bizzy memory search "error handling" --format compact --limit 5

# Full context when needed
aes-bizzy memory search "architecture decisions" --format full --limit 3
```

## When to Use

1. **Starting a new task** - Recall similar implementations
2. **Encountering an error** - Search for past resolutions
3. **Making design decisions** - Find related patterns/decisions
4. **Implementing features** - Look for reusable approaches
5. **Debugging** - Search for similar error contexts

## Integration Patterns

### Pre-Implementation Recall
Before starting any significant implementation:
```
1. Identify the core problem/feature
2. Search for similar past work: aes-bizzy memory search "<feature description>"
3. Review relevant patterns and lessons
4. Apply learnings to current implementation
```

### Error Investigation
When encountering errors:
```
1. Copy the error message/type
2. Search: aes-bizzy memory search "<error type or message>"
3. Review past resolutions
4. Apply successful fixes
```

### Decision Support
When making technical decisions:
```
1. Identify the decision domain (architecture, library choice, etc.)
2. Search: aes-bizzy memory search "<decision context>" --type decision
3. Review prior rationale and outcomes
4. Make informed choice
```

## Response Format

Recall results include:
- **Relevance Score**: Semantic similarity (0-100%)
- **Memory Type**: lesson, pattern, error, decision, context
- **Tags**: Categorization for filtering
- **Content**: The stored knowledge
- **Created**: When the memory was stored
- **TTL**: Time-to-live if set

## Best Practices

1. **Be Specific**: More detailed queries yield better matches
2. **Use Filters**: Narrow results with type and tag filters
3. **Start Broad, Then Narrow**: If few results, broaden the query
4. **Check Multiple Types**: Errors might relate to patterns, decisions to context
5. **Cross-Project Learning**: Patterns from one project may apply to others

## Cross-References

- **store-lesson.md**: Store new learnings from current work
- **search-memory.md**: Full-text search with advanced filters
- **project-memory.md**: Project-specific memory summaries
- **hooks/heimdall/**: Automatic memory capture hooks

## MCP Tool Mapping

This skill uses the Heimdall MCP server tools:
- `heimdall_query_memories` - Semantic search
- `heimdall_get_memories` - Tag-based retrieval
