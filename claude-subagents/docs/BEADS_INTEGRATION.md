# Beads Integration

Agent assignment workflow using Beads task management.

## Overview

Beads provides token-efficient task tracking. A.E.S - Bizzy extends it with agent assignment capabilities.

## Agent Assignment

### Creating Tasks with Assignment

```bash
# Assign during creation
aes-bizzy beads create "Implement login" --assign frontend-dev

# With priority and dependencies
aes-bizzy beads create "API endpoint" --assign backend-dev -p 1 --deps parent:epic-1
```

### Filtering by Agent

```bash
# Get ready tasks for agent
aes-bizzy beads ready --assigned backend-dev

# List all tasks for agent
aes-bizzy beads list --assigned frontend-dev
```

### Reassigning Tasks

```bash
# Assign to new agent
aes-bizzy beads assign ABC123 devops-engineer

# Remove assignment
aes-bizzy beads unassign ABC123 frontend-dev
```

## How It Works

Agent assignments are stored as Beads tags:

```
agent:frontend-dev
agent:backend-dev
```

This enables:
- Native Beads CLI compatibility
- Git-based sync and versioning
- Multi-agent task distribution

## Workflow Example

```bash
# PM creates sprint tasks
aes-bizzy beads create "User authentication" --assign backend-dev -p 1
aes-bizzy beads create "Login form UI" --assign frontend-dev -p 2 --deps blocks:ABC123
aes-bizzy beads create "Auth tests" --assign test-engineer -p 3 --deps blocks:ABC124

# Agents query their tasks
aes-bizzy beads ready --assigned backend-dev
aes-bizzy beads ready --assigned frontend-dev

# Update status as work progresses
aes-bizzy beads status ABC123 in_progress
aes-bizzy beads status ABC123 done -n "Implemented JWT auth"
```

## Multi-Agent Coordination

For complex features requiring multiple agents:

1. PM creates parent task
2. Subtasks assigned to different agents
3. Dependencies ensure correct execution order
4. Status updates enable handoffs
