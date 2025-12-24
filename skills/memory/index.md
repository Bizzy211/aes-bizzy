# Heimdall Memory Skills

## Overview

These skills provide manual interaction with the Heimdall persistent memory system. They complement the automatic memory hooks that capture knowledge during normal development workflows.

## Available Skills

| Skill | Purpose | Primary Use Case |
|-------|---------|-----------------|
| [recall-similar.md](./recall-similar.md) | Semantic search | Find similar past solutions |
| [store-lesson.md](./store-lesson.md) | Manual storage | Capture insights and patterns |
| [search-memory.md](./search-memory.md) | Advanced search | Precise filtered queries |
| [project-memory.md](./project-memory.md) | Project context | Project-specific summaries |

## Quick Reference

### Store a Lesson
```bash
aes-bizzy memory store "Lesson content" --type lesson --tags "tech:typescript"
```

### Search Memories
```bash
aes-bizzy memory search "query" --type pattern --limit 10
```

### List Recent
```bash
aes-bizzy memory list --limit 20
```

### Get Stats
```bash
aes-bizzy memory stats
```

## Memory Types

- `lesson` - Insights and learnings
- `pattern` - Reusable solutions
- `decision` - Architectural choices
- `error` - Error resolutions
- `context` - Project context
- `snippet` - Code snippets
- `reference` - External resources

## Tag Prefixes

- `agent:` - Agent context (agent:frontend-dev)
- `project:` - Project scope (project:my-app)
- `task:` - Task reference (task:15.2)
- `tech:` - Technology (tech:react)
- `component:` - Component (component:auth)
- `feature:` - Feature (feature:login)
- `error:` - Error type (error:TypeError)
- `pattern:` - Pattern name (pattern:singleton)

## Automatic vs Manual

### Automatic (Hooks)
These hooks automatically capture memories:
- `post_task_complete.py` - Task completions
- `post_commit.py` - Git commits
- `error_resolved.py` - Error fixes
- `session_end.py` - Session summaries
- `prd_parsed.py` - PRD parsing
- `post_agent_task.py` - Sub-agent work

### Manual (These Skills)
Use these skills for:
- Curated lessons and insights
- Cross-project patterns
- Design decisions and rationale
- Important references
- Custom knowledge capture

## Integration with Agents

Agents can integrate memory capabilities by:
1. Calling `aes-bizzy memory` commands via Bash
2. Using Heimdall MCP tools directly
3. Following memory patterns in their workflows

See individual agent templates for specific memory integration patterns.

## Related Components

- **CLI**: `src/cli/memory.ts` - Memory command implementation
- **Hooks**: `hooks/heimdall/` - Automatic memory capture
- **Storage**: `src/heimdall/storage-manager.ts` - Storage layer
- **Query**: `src/heimdall/query-optimizer.ts` - Optimized retrieval
- **Tagging**: `src/heimdall/tagging.ts` - Tag validation
