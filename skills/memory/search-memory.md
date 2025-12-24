# Search Memory Skill

## Overview

Full-text and semantic search of Heimdall persistent memory with advanced filtering by project, tags, dates, and memory types. Use for precise memory retrieval when you know specific criteria.

## Usage

```bash
/memory search "query" --type lesson --project my-app
/memory find "authentication" --tags tech:react --since 7d
```

## Core Commands

### Basic Search
```bash
# Semantic search
aes-bizzy memory search "database connection pooling"

# List recent memories
aes-bizzy memory list --limit 20

# List by type
aes-bizzy memory list --type lesson
aes-bizzy memory list --type error
```

### Filtered Search
```bash
# By memory type
aes-bizzy memory search "query" --type pattern
aes-bizzy memory search "query" --type decision

# By project
aes-bizzy memory search "query" --tags "project:my-webapp"

# By technology
aes-bizzy memory search "query" --tags "tech:typescript"

# By task
aes-bizzy memory search "query" --tags "task:15"

# Combined filters
aes-bizzy memory search "error handling" --type lesson --tags "tech:react,project:frontend"
```

### Advanced Filters
```bash
# Multiple tags (AND logic)
aes-bizzy memory search "state" --tags "tech:react,component:auth"

# Limit results
aes-bizzy memory search "patterns" --limit 5

# Output format
aes-bizzy memory search "query" --format compact  # Minimal output
aes-bizzy memory search "query" --format full     # Complete details
aes-bizzy memory search "query" --format json     # JSON output
```

## Search Strategies

### Exploratory Search
When you're not sure what exists:
```bash
# Start broad
aes-bizzy memory list --limit 50

# Then filter by type
aes-bizzy memory list --type lesson --limit 20

# Then add project filter
aes-bizzy memory search "api" --tags "project:current-project"
```

### Targeted Search
When looking for specific knowledge:
```bash
# Error resolution lookup
aes-bizzy memory search "TypeError: Cannot read property" --type error

# Pattern lookup
aes-bizzy memory search "retry mechanism" --type pattern

# Decision history
aes-bizzy memory search "database choice" --type decision
```

### Cross-Project Search
Finding patterns across projects:
```bash
# Technology-specific across all projects
aes-bizzy memory search "authentication" --tags "tech:react"

# Pattern type across all projects
aes-bizzy memory search "caching strategy" --type pattern
```

## Filter Reference

### Memory Types
| Type | Description |
|------|-------------|
| `lesson` | Insights and learnings |
| `pattern` | Reusable solutions |
| `decision` | Architectural choices |
| `error` | Error resolutions |
| `context` | Project context |
| `interaction` | User preferences |
| `preference` | Configuration preferences |
| `snippet` | Code snippets |
| `reference` | External resources |

### Tag Prefixes
| Prefix | Usage | Example |
|--------|-------|---------|
| `agent:` | Agent context | `agent:frontend-dev` |
| `project:` | Project scope | `project:my-app` |
| `task:` | Task reference | `task:15.2` |
| `type:` | Memory type | `type:lesson` |
| `tech:` | Technology | `tech:typescript` |
| `component:` | Component | `component:auth` |
| `feature:` | Feature | `feature:login` |
| `error:` | Error type | `error:TypeError` |
| `pattern:` | Pattern name | `pattern:singleton` |

## Output Interpretation

### Compact Format
```
[lesson] Authentication should use HttpOnly cookies (92%)
[error] Fixed CORS by adding origin header (87%)
[pattern] Retry with exponential backoff (85%)
```

### Full Format
```
Memory ID: mem_abc123
Type: lesson
Created: 2024-01-15T10:30:00Z
Relevance: 92%
Tags: tech:typescript, component:auth, project:webapp

Content:
Authentication tokens should be stored in HttpOnly cookies
rather than localStorage to prevent XSS attacks...
```

## Search Optimization Tips

1. **Use Specific Terms**: "React useState hook" > "state"
2. **Combine Filters**: Type + tag filters narrow results effectively
3. **Start Specific, Then Broaden**: Begin narrow, expand if no results
4. **Check Multiple Types**: An "error" might also be tagged as "lesson"
5. **Use Compact Format First**: Quick scan, then get full details

## Common Search Patterns

### "How did I solve this before?"
```bash
aes-bizzy memory search "<error message>" --type error
```

### "What patterns exist for this?"
```bash
aes-bizzy memory search "<domain>" --type pattern
```

### "What decisions were made?"
```bash
aes-bizzy memory search "<topic>" --type decision --tags "project:..."
```

### "What did I learn about this?"
```bash
aes-bizzy memory search "<topic>" --type lesson
```

### "What's the context for this project?"
```bash
aes-bizzy memory search "overview" --tags "project:..." --type context
```

## Cross-References

- **recall-similar.md**: Semantic similarity search
- **store-lesson.md**: Store new memories
- **project-memory.md**: Project memory summaries
- **query-optimizer.ts**: Token-optimized retrieval

## MCP Tool Mapping

This skill uses the Heimdall MCP server tools:
- `heimdall_query_memories` - Semantic search
- `heimdall_get_memories` - Tag-based retrieval
- `heimdall_count_memories` - Memory statistics
