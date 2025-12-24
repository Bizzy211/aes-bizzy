---
name: memory-integration
description: Heimdall Memory Integration Guide for all A.E.S - Bizzy agents. Reference this for memory-aware agent workflows.
---

# Heimdall Memory Integration Guide

This guide provides memory integration patterns for all A.E.S - Bizzy agents. Use these patterns to leverage persistent memory across sessions.

## Quick Reference

### Core Memory Commands
```bash
# Search memories
aes-bizzy memory search "query" --type lesson --limit 10

# Store a memory
aes-bizzy memory store "content" --type lesson --tags "project:...,tech:..."

# List recent memories
aes-bizzy memory list --limit 20

# Get memory stats
aes-bizzy memory stats
```

### Memory Types
| Type | Use For |
|------|---------|
| `lesson` | Insights and learnings |
| `pattern` | Reusable solutions |
| `decision` | Architectural choices |
| `error` | Error resolutions |
| `context` | Project context |
| `snippet` | Code snippets |

### Tag Prefixes
- `agent:frontend-dev` - Agent context
- `project:my-app` - Project scope
- `task:15.2` - Task reference
- `tech:react` - Technology
- `component:auth` - Component
- `error:TypeError` - Error type
- `pattern:singleton` - Pattern name

---

## Agent-Specific Patterns

### PM Lead - Project Orchestration

**Session Start - Load Project Context:**
```bash
aes-bizzy memory search "project overview" --tags "project:${PROJECT}" --type context
aes-bizzy memory search "architecture" --tags "project:${PROJECT}" --type decision
```

**Store Project Decisions:**
```bash
aes-bizzy memory store "
## Decision: ${TITLE}
**Context**: ${SITUATION}
**Decision**: ${CHOICE}
**Rationale**: ${WHY}
" --type decision --tags "project:${PROJECT}"
```

**Recall Similar Projects:**
```bash
aes-bizzy memory search "project ${TYPE}" --type context
```

---

### Frontend Dev - UI Implementation

**Before Starting Work:**
```bash
aes-bizzy memory search "React ${COMPONENT_TYPE}" --type pattern
aes-bizzy memory search "${FEATURE} implementation" --type lesson
```

**Store UI Patterns:**
```bash
aes-bizzy memory store "
## Pattern: ${NAME}
**Problem**: ${SOLVED}
**Solution**: ${APPROACH}
" --type pattern --tags "tech:react,component:${NAME}"
```

---

### Backend Dev - API & Database

**Before Starting Work:**
```bash
aes-bizzy memory search "API ${RESOURCE}" --type pattern
aes-bizzy memory search "database ${OPERATION}" --type pattern
```

**Store API Patterns:**
```bash
aes-bizzy memory store "
## Pattern: ${NAME}
**Use Case**: ${WHEN}
**Implementation**: ${HOW}
" --type pattern --tags "tech:nodejs"
```

---

### Debugger - Error Resolution

**ALWAYS Search First:**
```bash
aes-bizzy memory search "${ERROR_MESSAGE}" --type error
aes-bizzy memory search "${ERROR_TYPE}" --type error
```

**Store Error Resolutions (REQUIRED):**
```bash
aes-bizzy memory store "
## Error: ${ERROR_TYPE}
**Symptoms**: ${OBSERVED}
**Root Cause**: ${CAUSE}
**Resolution**: ${FIX}
**Prevention**: ${AVOID}
" --type error --tags "tech:${TECH},error:${TYPE}"
```

---

### Test Engineer - Testing Patterns

**Before Writing Tests:**
```bash
aes-bizzy memory search "testing ${DOMAIN}" --type pattern
aes-bizzy memory search "test ${FRAMEWORK}" --type lesson
```

**Store Testing Insights:**
```bash
aes-bizzy memory store "
## Testing Pattern: ${NAME}
**Scenario**: ${USE_CASE}
**Approach**: ${STRATEGY}
" --type pattern --tags "testing,component:${NAME}"
```

---

### DevOps Engineer - Infrastructure

**Before Infrastructure Changes:**
```bash
aes-bizzy memory search "deployment ${TECHNOLOGY}" --type pattern
aes-bizzy memory search "infrastructure ${DOMAIN}" --type lesson
```

**Store DevOps Patterns:**
```bash
aes-bizzy memory store "
## DevOps Pattern: ${NAME}
**Use Case**: ${SCENARIO}
**Configuration**: ${SETUP}
" --type pattern --tags "devops,tech:${TECH}"
```

---

### DB Architect - Database Design

**Before Schema Design:**
```bash
aes-bizzy memory search "database schema ${DOMAIN}" --type pattern
aes-bizzy memory search "migration ${TYPE}" --type lesson
```

**Store Database Decisions:**
```bash
aes-bizzy memory store "
## Database Decision: ${NAME}
**Context**: ${SCENARIO}
**Schema**: ${APPROACH}
**Rationale**: ${WHY}
" --type decision --tags "tech:postgresql,component:${NAME}"
```

---

## Automatic Memory Capture

These hooks automatically store memories:

| Hook | Trigger | Captures |
|------|---------|----------|
| `post_task_complete.py` | TaskMaster task done | Task details |
| `post_commit.py` | Git commit | Commit context |
| `error_resolved.py` | Debug activity | Error fixes |
| `session_end.py` | Session ends | Session summary |
| `prd_parsed.py` | PRD parsed | Requirements |
| `post_agent_task.py` | Sub-agent done | Agent lessons |

## Best Practices

1. **Search Before Implementing** - Check if similar work was done before
2. **Store Non-Trivial Solutions** - Anything that took significant effort
3. **Use Consistent Tags** - Follow the tag taxonomy for better retrieval
4. **Include Context** - Future you needs to understand why
5. **Store Error Resolutions** - Debugger should always store fixes

## Related Skills

- `skills/memory/recall-similar.md` - Semantic search
- `skills/memory/store-lesson.md` - Manual storage
- `skills/memory/search-memory.md` - Advanced search
- `skills/memory/project-memory.md` - Project summaries

---

*Heimdall Memory - Persistent Agent Knowledge for A.E.S - Bizzy*
