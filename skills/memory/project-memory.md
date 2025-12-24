# Project Memory Skill

## Overview

Project-specific memory summaries grouped by categories. Use to get a comprehensive view of accumulated knowledge, patterns, decisions, and lessons for a specific project.

## Usage

```bash
/memory project my-webapp
/memory project-summary current
```

## Core Commands

### Project Overview
```bash
# Get all memories for a project
aes-bizzy memory list --tags "project:my-webapp"

# Get memory statistics for project
aes-bizzy memory stats --project my-webapp

# Export project memories
aes-bizzy memory export --tags "project:my-webapp" --output project-memories.json
```

### Category Views
```bash
# Project lessons
aes-bizzy memory search "project context" --type lesson --tags "project:my-webapp"

# Project decisions
aes-bizzy memory search "architecture" --type decision --tags "project:my-webapp"

# Project patterns
aes-bizzy memory search "implementation" --type pattern --tags "project:my-webapp"

# Project errors resolved
aes-bizzy memory search "fixed" --type error --tags "project:my-webapp"
```

### Current Project Context
```bash
# Detect current project from directory
aes-bizzy memory list --tags "project:$(basename $(pwd))"

# Recent project activity
aes-bizzy memory list --tags "project:current" --limit 10
```

## Project Memory Categories

### Context Memories
Background information about the project:
```bash
aes-bizzy memory search "overview architecture" --type context --tags "project:..."
```
Includes:
- Project structure and organization
- Technology stack decisions
- Team conventions
- External dependencies

### Lesson Memories
Insights learned during development:
```bash
aes-bizzy memory search "learned" --type lesson --tags "project:..."
```
Includes:
- What worked well
- What to avoid
- Performance insights
- Best practices discovered

### Pattern Memories
Reusable solutions specific to the project:
```bash
aes-bizzy memory search "pattern" --type pattern --tags "project:..."
```
Includes:
- Component patterns
- API patterns
- Data flow patterns
- Testing patterns

### Decision Memories
Architectural and design decisions:
```bash
aes-bizzy memory search "decided chose" --type decision --tags "project:..."
```
Includes:
- Technology choices
- Architecture decisions
- Trade-off analyses
- Future considerations

### Error Memories
Resolved issues and their fixes:
```bash
aes-bizzy memory search "error fixed" --type error --tags "project:..."
```
Includes:
- Common errors encountered
- Root causes identified
- Solutions applied
- Prevention strategies

## Project Memory Report

Generate a comprehensive project memory report:

```bash
# Create a structured report
echo "# Project Memory Report: my-webapp"
echo ""
echo "## Project Context"
aes-bizzy memory search "overview" --type context --tags "project:my-webapp" --format compact

echo ""
echo "## Key Decisions"
aes-bizzy memory search "decided" --type decision --tags "project:my-webapp" --format compact

echo ""
echo "## Patterns Established"
aes-bizzy memory search "pattern" --type pattern --tags "project:my-webapp" --format compact

echo ""
echo "## Lessons Learned"
aes-bizzy memory search "learned" --type lesson --tags "project:my-webapp" --format compact

echo ""
echo "## Errors Resolved"
aes-bizzy memory search "fixed" --type error --tags "project:my-webapp" --format compact
```

## Project Onboarding

When starting work on an existing project:

### Step 1: Load Project Context
```bash
# Get project overview
aes-bizzy memory search "project overview architecture" --tags "project:TARGET" --type context
```

### Step 2: Review Key Decisions
```bash
# Understand why things are built this way
aes-bizzy memory search "decided chose because" --tags "project:TARGET" --type decision
```

### Step 3: Check Established Patterns
```bash
# Learn the project's patterns
aes-bizzy memory search "pattern approach" --tags "project:TARGET" --type pattern
```

### Step 4: Review Common Pitfalls
```bash
# Avoid past mistakes
aes-bizzy memory search "error avoid" --tags "project:TARGET" --type error
```

## Cross-Project Insights

Find patterns that might apply across projects:

```bash
# Find similar technology usage
aes-bizzy memory search "authentication" --tags "tech:react" --type pattern

# Find cross-project lessons
aes-bizzy memory search "performance optimization" --type lesson

# Find universal error solutions
aes-bizzy memory search "TypeScript error" --type error
```

## Project Memory Maintenance

### Adding Project Context
When starting a new project:
```bash
aes-bizzy memory store "
## Project: my-new-app

**Purpose**: [What this project does]

**Tech Stack**:
- Frontend: React, TypeScript
- Backend: Node.js, Express
- Database: PostgreSQL

**Architecture**: [High-level architecture]

**Conventions**: [Team/project conventions]
" --type context --tags "project:my-new-app,tech:react,tech:typescript"
```

### Pruning Old Memories
Clean up outdated project memories:
```bash
# Review old memories
aes-bizzy memory list --tags "project:old-project"

# Delete specific memories
aes-bizzy memory delete <memory-id>

# Prune with filters (careful!)
aes-bizzy memory prune --tags "project:archived-project" --confirm
```

## Session Start Integration

The `session_start.py` hook automatically loads:
1. Project-specific memories (matched by directory name)
2. Recent lessons applicable to current work
3. Error resolutions for debugging reference

## Best Practices

1. **Tag Consistently**: Always use `project:name` tag for project memories
2. **Update Context**: Keep project context memories current
3. **Document Decisions**: Record rationale for significant choices
4. **Capture Patterns**: Extract reusable patterns as they emerge
5. **Review Periodically**: Check project memories for relevance

## Cross-References

- **recall-similar.md**: Find similar solutions
- **store-lesson.md**: Store new project learnings
- **search-memory.md**: Detailed memory search
- **session_start.py**: Automatic context loading at session start

## MCP Tool Mapping

This skill uses the Heimdall MCP server tools:
- `heimdall_query_memories` - Project-filtered search
- `heimdall_get_memories` - Tag-based project retrieval
- `heimdall_count_memories` - Project memory statistics
