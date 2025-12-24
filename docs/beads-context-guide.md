# Beads Context Integration Guide

This guide covers the Beads context management system integrated with the A.E.S Bizzy CLI and multi-agent orchestration.

## Overview

The Beads context system provides rich context storage and recall for multi-agent workflows. It enables agents to:

- Store architectural decisions, learnings, and patterns
- Retrieve relevant context before starting tasks
- Share handoff data between agents
- Maintain project knowledge across sessions

## Quick Start

```bash
# Add a new context bead
aes-bizzy context add "API uses REST with JSON responses" --type decision --agent backend-dev

# Search for context
aes-bizzy context search "API" --type decision

# List all context beads
aes-bizzy context list

# Prime context for an agent
aes-bizzy context prime --agent frontend-dev --task 42
```

## Command Reference

### `aes-bizzy context add <title>`

Add a new context bead to storage.

**Options:**
- `--type <type>` - Context type: `decision`, `learning`, `architecture`, `pattern`, `blocker`, `handoff`
- `--agent <agent>` - Agent type (e.g., `frontend-dev`, `backend-dev`)
- `--task <id>` - Task Master task ID
- `--tags <tags...>` - Additional semantic tags
- `--description <text>` - Detailed description
- `--global` - Store in global scope (~/.beads)
- `--json` - Output as JSON

**Example:**
```bash
aes-bizzy context add "Use TypeScript strict mode" \
  --type pattern \
  --agent pm-lead \
  --tags typescript,config
```

### `aes-bizzy context search [query]`

Search context by keywords, tags, or type.

**Options:**
- `--type <type>` - Filter by context type
- `--agent <agent>` - Filter by agent
- `--tags <tags...>` - Filter by tags (AND logic)
- `--limit <n>` - Maximum results (default: 10)
- `--global` - Search global scope
- `--json` - Output as JSON

**Example:**
```bash
aes-bizzy context search "authentication" --type decision --agent backend-dev
```

### `aes-bizzy context list`

List all context beads with filtering.

**Options:**
- `--type <type>` - Filter by type
- `--agent <agent>` - Filter by agent
- `--task <id>` - Filter by task
- `--date <range>` - Filter by date: `last-day`, `last-week`, `last-month`, `all`
- `--global` - List global scope
- `--json` - Output as JSON

### `aes-bizzy context show <beadId>`

Display full details of a context bead.

**Options:**
- `--global` - Look in global scope
- `--json` - Output as JSON

### `aes-bizzy context remove <beadId>`

Remove a context bead (moves to trash).

**Options:**
- `--confirm` - Skip confirmation prompt
- `--global` - Remove from global scope

### `aes-bizzy context tags`

List all tags with usage counts.

**Options:**
- `--type <prefix>` - Filter by prefix (e.g., `agent:`, `type:`, `component:`)
- `--global` - List from global scope
- `--json` - Output as JSON

### `aes-bizzy context sync`

Sync handoff data from Task Master to Beads.

**Options:**
- `--task-id <id>` - Sync specific task only
- `--global` - Store in global scope

### `aes-bizzy context prime`

Export assembled context for agent consumption.

**Options:**
- `--agent <type>` - Target agent type
- `--task <id>` - Target task ID
- `--format <fmt>` - Output format: `prompt`, `json`, `markdown`
- `--max-tokens <n>` - Token limit (default: 5000)
- `--output <file>` - Output file path
- `--global` - Include global context

**Example:**
```bash
# Prime context for a frontend task
aes-bizzy context prime --agent frontend-dev --task 42 --format prompt

# Export to file for CLAUDE.md injection
aes-bizzy context prime --agent backend-dev --output .claude/context.md
```

### `aes-bizzy context export`

Export all context to JSON or Markdown.

**Options:**
- `--format <fmt>` - Export format: `json`, `markdown`
- `--output <file>` - Output file path
- `--global` - Export global scope

### `aes-bizzy context import <file>`

Import context from JSON export file.

**Options:**
- `--merge` - Merge with existing (default: replace)
- `--global` - Import to global scope

## Context Types

| Type | Description | When to Use |
|------|-------------|-------------|
| `decision` | Architectural or technical decisions | Recording why a specific approach was chosen |
| `learning` | Lessons learned | Insights gained during development |
| `architecture` | System architecture docs | High-level design documentation |
| `pattern` | Code patterns or conventions | Established patterns to follow |
| `blocker` | Blocking issues encountered | Problems that need resolution |
| `handoff` | Agent handoff context | Automatically created from agent handoffs |

## Tagging Taxonomy

Context beads are automatically tagged with:

| Prefix | Description | Example |
|--------|-------------|---------|
| `project:` | Project name | `project:my-app` |
| `agent:` | Agent type | `agent:frontend-dev` |
| `type:` | Context type | `type:decision` |
| `task:` | Task ID | `task:42` |

Additional semantic tags can be added:

| Prefix | Description | Example |
|--------|-------------|---------|
| `component:` | UI/backend components | `component:auth-form` |
| `feature:` | Feature areas | `feature:user-auth` |
| `tech:` | Technologies | `tech:react,tech:typescript` |

## Dual Scope Support

### Project Scope (Default)

Stored in `.beads/` directory within the project:
- Project-specific decisions and learnings
- Committed to git (with .gitignore for trash)
- Shared across team members

### Global Scope

Stored in `~/.beads/` in home directory:
- Team standards and best practices
- Personal learnings across projects
- Not committed to git

Use `--global` flag with any command to use global scope.

## Agent Integration

### Pre-Task Context Loading

Before spawning an agent, load relevant context:

```typescript
import { preTaskContextLoad } from '@jhc/claude-ecosystem/hooks';

const { bundle, output } = await preTaskContextLoad('42.1', 'frontend-dev', {
  format: 'prompt',
  maxTokens: 5000,
});

// Inject into agent prompt
const agentPrompt = `
${output}

Now implement the task...
`;
```

### Post-Task Context Saving

After agent completion, save handoff data:

```typescript
import { postTaskContextSave } from '@jhc/claude-ecosystem/hooks';

await postTaskContextSave('42.1', 'frontend-dev', handoffData, {
  extractDecisions: true,
  extractLearnings: true,
});
```

### Context Assembly

Assemble context from multiple sources:

```typescript
import { assembleContextForAgent } from '@jhc/claude-ecosystem/beads';

const bundle = await assembleContextForAgent('42', 'backend-dev', {
  maxTokens: 8000,
  includeGlobal: true,
});

console.log(bundle.combinedPrompt);
```

## Multi-Agent Handoff Example

### 1. PM-Lead Creates Task with Context

```bash
# PM-Lead stores architecture decision
aes-bizzy context add "Use Supabase for auth with RLS" \
  --type decision \
  --agent pm-lead \
  --task 42 \
  --tags auth,supabase,rls
```

### 2. Frontend-Dev Retrieves Context

```bash
# Frontend developer gets relevant context before starting
aes-bizzy context prime --agent frontend-dev --task 42
```

### 3. Frontend-Dev Saves Decision

After completing work:

```bash
aes-bizzy context add "Created useAuth hook with session persistence" \
  --type pattern \
  --agent frontend-dev \
  --task 42.1 \
  --tags auth,hooks,react
```

### 4. Backend-Dev Retrieves Frontend Decisions

```bash
# Backend developer can see frontend patterns
aes-bizzy context search "auth" --agent frontend-dev
```

## Hook Configuration

### Claude Code Settings

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolCall": [
      {
        "matcher": "Task",
        "script": "aes-bizzy context prime --agent $AGENT_TYPE --task $TASK_ID --output .claude/context.md"
      }
    ],
    "PostToolCall": [
      {
        "matcher": "Task",
        "script": "aes-bizzy context sync --task-id $TASK_ID"
      }
    ]
  }
}
```

## Best Practices

### When to Store Decisions

- Choosing between technologies or patterns
- Architectural trade-offs
- API design choices
- Security considerations

### When to Store Learnings

- Debugging insights
- Performance discoveries
- Integration quirks
- Tool/library behaviors

### When to Store Patterns

- Established code conventions
- Component structures
- Error handling approaches
- Testing strategies

### Context Pruning

Periodically review and clean up context:

```bash
# List old context
aes-bizzy context list --date last-month

# Remove outdated entries
aes-bizzy context remove <old-bead-id> --confirm
```

## Storage Format

Context is stored in `.beads/interactions.jsonl` as line-delimited JSON:

```json
{"id":"abc123","title":"Use REST API","contextType":"decision","scope":"project","tags":["type:decision","agent:backend-dev"],"createdAt":"2025-01-15T10:00:00Z"}
```

Deleted items are moved to `.beads/.trash/` for recovery.

## Troubleshooting

### Context Not Found

```bash
# Check scope - may be in global
aes-bizzy context list --global

# Verify Beads is initialized
aes-bizzy beads status
```

### Duplicate Context

Use `--merge` flag when importing to avoid duplicates:

```bash
aes-bizzy context import backup.json --merge
```

### Token Limit Exceeded

Reduce context scope or increase limit:

```bash
aes-bizzy context prime --max-tokens 10000 --agent specific-agent
```
