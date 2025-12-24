# Beads - Token-Efficient Task Management

Beads CLI (`bd`) provides lightweight task management optimized for AI agent workflows with minimal token overhead.

## Overview

Beads tracks tasks with agent assignment, enabling coordinated multi-agent work without context bloat.

## Core Commands

### Task Creation with Agent Assignment

```bash
# Create task assigned to specific agent
bd create "Implement user authentication" --assign backend-dev --priority high

# Create task with dependencies
bd create "Write API tests" --assign test-engineer --depends-on auth-implementation

# Quick task creation
bd add "Fix login bug" --assign debugger
```

### Agent-Specific Task Retrieval

```bash
# Get tasks ready for current agent
bd ready --json

# Filter by assigned agent
bd ready --assigned backend-dev --json

# Get stale tasks (not updated recently)
bd stale --assigned security-expert
```

### Task Updates

```bash
# Update task with progress note
bd update TASK_ID --add-note "Completed auth middleware, starting JWT implementation"

# Change task status
bd set-status TASK_ID in-progress
bd set-status TASK_ID done

# Reassign task to different agent
bd reassign TASK_ID --to frontend-dev
```

### Context Management

```bash
# Save session context before exit (CRITICAL)
bd sync

# Load context at session start
bd ready --json

# Export context for handoff
bd export TASK_ID --format json
```

## Beads Integration Patterns

### Session Start Hook Integration

```python
# In hooks/essential/session_start.py
result = subprocess.run(["bd", "ready", "--json"], capture_output=True)
context = json.loads(result.stdout)
```

### Session End Hook Integration

```python
# In hooks/essential/stop.py - CRITICAL
subprocess.run(["bd", "sync"])  # Always sync before exit
```

### Agent Handoff Pattern

```bash
# Agent A completes initial work
bd update TASK_ID --add-note "Backend API complete, ready for frontend"
bd reassign TASK_ID --to frontend-dev

# Agent B picks up
bd ready --assigned frontend-dev --json
```

## Cross-References

### Related Agents
- **pm-lead**: Creates and assigns tasks via Beads
- **backend-dev**: Receives backend task assignments
- **frontend-dev**: Receives frontend task assignments
- **test-engineer**: Receives testing task assignments
- **debugger**: Receives debugging task assignments

### Related Skills
- **task-master**: Higher-level task management with AI assistance
- **project-init**: Initializes Beads in new projects

### Related Hooks
- **session_start.py**: Loads Beads context
- **stop.py**: Syncs Beads before exit
- **subagent_stop.py**: Logs agent handoffs

## Task Metadata Structure

```json
{
  "id": "task-uuid",
  "title": "Task title",
  "status": "pending|in-progress|done|blocked",
  "priority": "low|medium|high|critical",
  "assignedAgent": "agent-name",
  "dependencies": ["other-task-id"],
  "notes": [
    {"timestamp": "ISO-8601", "content": "Progress note"}
  ],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

## Best Practices

1. **Always sync before session end** - Use `bd sync` in stop hooks
2. **Use agent assignment** - Enable coordinated multi-agent work
3. **Add progress notes** - Create audit trail for context
4. **Keep tasks granular** - Easier for agents to complete
5. **Use dependencies** - Prevent blocked work

---

*A.E.S - Bizzy Skill - Beads Task Management v1.0.0*
