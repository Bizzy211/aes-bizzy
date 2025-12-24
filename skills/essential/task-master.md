# Task Master - AI-Powered Task Management

Task Master provides AI-enhanced task management with complexity analysis, automatic expansion, and research-backed updates.

## Overview

Task Master extends basic task management with AI capabilities for breaking down complex tasks, analyzing dependencies, and maintaining project context.

## Core Commands

### Project Initialization

```bash
# Initialize Task Master in project
task-master init

# Parse PRD to generate tasks
task-master parse-prd .taskmaster/docs/prd.md

# Parse with research enhancement
task-master parse-prd .taskmaster/docs/prd.md --research
```

### Daily Workflow

```bash
# List all tasks
task-master list

# Get next available task
task-master next

# Show task details
task-master show TASK_ID

# Set task status
task-master set-status --id=TASK_ID --status=done
```

### Task Expansion

```bash
# Expand single task into subtasks
task-master expand --id=TASK_ID --research

# Expand all pending tasks
task-master expand --all --research

# Analyze complexity before expansion
task-master analyze-complexity --research
```

### Task Updates

```bash
# Update specific task
task-master update-task --id=TASK_ID --prompt="Add authentication requirements"

# Update subtask with implementation notes
task-master update-subtask --id=TASK_ID.SUBTASK_ID --prompt="Completed JWT setup"

# Batch update from task ID onwards
task-master update --from=TASK_ID --prompt="New API requirements"
```

## Beads Integration

### Syncing Task Master with Beads

```bash
# Store Task Master state in Beads
bd set task-master-state "$(task-master list --json)"

# Load project tasks context
bd get project-tasks

# Create Beads task from Task Master task
task-master show TASK_ID --json | bd import --from-stdin
```

### Agent Assignment via Beads

```bash
# Get next task and assign to agent
TASK=$(task-master next --json)
bd create "$TASK" --assign backend-dev

# Mark complete in both systems
task-master set-status --id=TASK_ID --status=done
bd set-status BEADS_ID done
```

### Session Context Pattern

```python
# Load combined context at session start
def load_context():
    # Task Master tasks
    tm_tasks = subprocess.run(
        ["task-master", "list", "--json"],
        capture_output=True
    )

    # Beads ready tasks
    bd_tasks = subprocess.run(
        ["bd", "ready", "--json"],
        capture_output=True
    )

    return {
        "taskmaster": json.loads(tm_tasks.stdout),
        "beads": json.loads(bd_tasks.stdout)
    }
```

## Cross-References

### Related Agents
- **pm-lead**: Uses Task Master for project planning
- **All specialist agents**: Receive tasks from Task Master

### Related Skills
- **beads**: Low-level task tracking with agent assignment
- **project-init**: Sets up Task Master in new projects

### Related Hooks
- **session_start.py**: Loads Task Master context
- **pre_compact.py**: Saves Task Master state before compaction

## MCP Tools

Task Master exposes these via MCP:

| Tool | Description |
|------|-------------|
| `get_tasks` | List all tasks |
| `next_task` | Get next available task |
| `get_task` | Show task details |
| `set_task_status` | Update task status |
| `expand_task` | Break into subtasks |
| `add_task` | Create new task |
| `update_subtask` | Add implementation notes |

## Task Structure

```json
{
  "id": "1.2",
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system",
  "status": "pending",
  "priority": "high",
  "dependencies": ["1.1"],
  "details": "Implementation details...",
  "testStrategy": "Unit and integration tests...",
  "subtasks": []
}
```

## Best Practices

1. **Use research flag** - Get AI-enhanced task analysis
2. **Expand complex tasks** - Break into manageable subtasks
3. **Update subtasks with notes** - Track implementation progress
4. **Sync with Beads** - Enable multi-agent coordination
5. **Analyze complexity first** - Understand scope before expanding

---

*A.E.S - Bizzy Skill - Task Master Integration v1.0.0*
