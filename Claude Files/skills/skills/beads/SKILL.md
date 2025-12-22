# Beads Task Tracking Skill

> Git-native issue tracking optimized for AI agent workflows

---

## When to Use This Skill

Use this skill when:
- Managing tasks, issues, or work items
- Tracking progress across agent sessions
- Coordinating handoffs between agents
- Creating dependency-aware task graphs
- Preserving context between conversations

**DO NOT use Beads MCP** - Use CLI commands instead (1-2k tokens vs 50k).

---

## Quick Reference

```bash
# Session Start
bd ready --json              # See unblocked work
bd show <id> --json          # Get task details

# Working
bd update <id> --status in_progress
bd update <id> --add-note "Progress update..."

# Completing
bd close <id> --reason "Summary of what was done"

# Discovering New Work
bd create "Found: issue" --deps discovered-from:<current_id>

# Session End (CRITICAL!)
bd sync                      # Commit to git
```

---

## Core Concepts

### Issue IDs
- Format: `bd-XXXX` (e.g., `bd-a3f8`)
- Hierarchical: `bd-a3f8.1` (subtask), `bd-a3f8.1.1` (sub-subtask)
- Hash-based to prevent merge conflicts

### Statuses
| Status | Meaning |
|--------|---------|
| `open` | Not started |
| `in_progress` | Being worked on |
| `blocked` | Waiting on dependency |
| `closed` | Completed |

### Dependencies
| Type | Syntax | Meaning |
|------|--------|---------|
| `blocks` | `--deps blocks:bd-xyz` | This blocks another issue |
| `parent` | `--deps parent:bd-xyz` | Child of epic/parent |
| `discovered-from` | `--deps discovered-from:bd-xyz` | Found while working on |

### Priority
- `1` = Highest (critical)
- `2` = High
- `3` = Medium (default)
- `4` = Low
- `5` = Lowest

---

## Standard Agent Workflow

### 1. Session Start
```bash
# Check what work is available (unblocked)
bd ready --json

# Output example:
# [{"id":"bd-a3f8","title":"Implement login","priority":1,"status":"open"}]
```

### 2. Claim Work
```bash
# Mark as in progress
bd update bd-a3f8 --status in_progress

# Read full context
bd show bd-a3f8 --json
```

### 3. During Work
```bash
# Add progress notes
bd update bd-a3f8 --add-note "Completed OAuth flow, starting session handling"

# If you discover new issues
bd create "Found: Session timeout not handled" \
  --description "Need to add session refresh logic" \
  -p 2 \
  --deps discovered-from:bd-a3f8 \
  --json
```

### 4. Complete Work
```bash
# Close with summary
bd close bd-a3f8 --reason "Implemented OAuth login with Google/GitHub providers. Added session management with 24h expiry."
```

### 5. Session End (CRITICAL)
```bash
# ALWAYS sync to git before ending session
bd sync

# Check for stale work
bd stale --days 1 --json
```

---

## Agent Handoff Pattern

When passing work to another agent:

### From Current Agent
```bash
# 1. Close your current work
bd close bd-a3f8 --reason "Backend API complete, ready for frontend integration"

# 2. Create handoff task
bd create "Frontend: Integrate login API" \
  --description "API endpoints ready at /api/auth/*. See bd-a3f8 for details." \
  -p 1 \
  --deps discovered-from:bd-a3f8 \
  --json

# 3. Add handoff note
bd update bd-b2c4 --add-note "HANDOFF to frontend-dev: OAuth endpoints ready, tokens in HttpOnly cookies"

# 4. Sync
bd sync
```

### Receiving Agent
```bash
# 1. Check ready work
bd ready --json

# 2. Read context from parent
bd show bd-a3f8 --json    # Original work
bd show bd-b2c4 --json    # Handoff task

# 3. Claim and continue
bd update bd-b2c4 --status in_progress
```

---

## Creating Epics and Subtasks

### Epic (Parent Task)
```bash
bd create "Epic: User Authentication System" \
  --description "Complete auth system with OAuth, sessions, and 2FA" \
  -t feature \
  -p 1 \
  --json

# Returns: bd-a3f8
```

### Subtasks
```bash
# Create subtasks under epic
bd create "OAuth provider integration" \
  --deps parent:bd-a3f8 \
  -p 1 \
  --json

bd create "Session management" \
  --deps parent:bd-a3f8 \
  -p 2 \
  --json

bd create "2FA implementation" \
  --deps parent:bd-a3f8 \
  --deps blocks:bd-a3f8.2 \
  -p 3 \
  --json
```

---

## Querying Tasks

### List All Open
```bash
bd list --status open --json
```

### Find by Priority
```bash
bd list --priority 1 --json
```

### Find Blocked Tasks
```bash
bd blocked --json
```

### Find Stale Tasks
```bash
bd stale --days 3 --json
```

### Search
```bash
bd search "authentication" --json
```

---

## Project Initialization

When starting a new project:

```bash
# Initialize Beads in project root
cd /path/to/project
bd init

# Create project epic
bd create "Project: My Application" \
  --description "Main project epic" \
  -t feature \
  -p 1 \
  --json

# Create initial milestones as child tasks
bd create "Milestone 1: MVP" --deps parent:bd-xxxx -p 1 --json
bd create "Milestone 2: Beta" --deps parent:bd-xxxx -p 2 --json
```

---

## Integration with GitHub

Beads handles daily tasks; GitHub handles external visibility:

```bash
# Create GitHub milestone for epic
mcp__github__create_milestone(title="MVP Release", due_on="2025-02-01")

# Reference in Beads
bd update bd-a3f8 --add-note "GitHub Milestone: #5"

# When closing epic, create GitHub release
bd close bd-a3f8 --reason "MVP complete"
mcp__github__create_release(tag="v1.0.0", name="MVP Release")
```

---

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Right |
|----------|----------|
| Forget `bd sync` at session end | Always run `bd sync` before ending |
| Use Beads MCP (50k tokens) | Use CLI commands (1-2k tokens) |
| Create orphan tasks | Use `--deps parent:` or `discovered-from:` |
| Skip status updates | Always `--status in_progress` when starting |
| Vague close reasons | Detailed `--reason` explaining what was done |

---

## Troubleshooting

### "bd: command not found"
```bash
# Windows
winget install steveyegge.beads

# macOS
brew install steveyegge/beads/bd

# npm (any platform)
npm install -g @beads/bd
```

### "No .beads directory"
```bash
bd init
```

### "Sync failed"
```bash
# Check git status
git status

# Manual commit if needed
git add .beads/
git commit -m "beads: manual sync"
```

### "Task not showing in bd ready"
```bash
# Check if blocked
bd show <id> --json | grep dependencies

# Check status
bd show <id> --json | grep status
```

---

## Best Practices

1. **Always claim before working**: `bd update <id> --status in_progress`
2. **Add notes as you go**: `bd update <id> --add-note "..."`
3. **Use discovered-from**: Links preserve context chain
4. **Sync at every break**: `bd sync` commits to git
5. **Check stale daily**: `bd stale --days 1`
6. **JSON output for parsing**: Always use `--json` flag
7. **Priority 1 = today**: Reserve P1 for immediate work

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
