# Slash Commands

Custom slash commands for Claude Code with Beads integration.

## Directory Structure

```
commands/
├── essential/              # Core slash commands (3)
│   ├── prime.md           # Load session context with agent list
│   ├── git_status.md      # Git repository status
│   └── question.md        # Answer questions without coding
│
└── optional/               # Additional commands (3)
    ├── all_tools.md       # List available tools and MCP servers
    ├── prime_tts.md       # Prime with TTS announcement
    └── update_status_line.md  # Update session status display
```

## Essential Commands (3)

Core commands for every session.

| Command | Description | Beads Integration |
|---------|-------------|-------------------|
| `/prime` | Load session context, agents, tasks | `bd status`, `bd ready` |
| `/git_status` | Git repository status | Optional logging |
| `/question` | Answer questions without coding | `bd get project-context` |

### /prime

Initialize a new working session:
- Load Beads task context
- Read project structure
- Display available agents from agent-index.json
- Show ready tasks

```bash
/prime
```

### /git_status

Comprehensive git repository status:
- Current branch and tracking
- Staged and unstaged changes
- Recent commits
- Remote status

```bash
/git_status
```

### /question

Answer questions about the project:
- Uses Beads context for informed answers
- Searches documentation
- No code modifications

```bash
/question "What agents are available?"
```

## Optional Commands (3)

Additional commands for specific workflows.

| Command | Description | Requirements |
|---------|-------------|--------------|
| `/all_tools` | List tools and MCP servers | None |
| `/prime_tts` | Prime with audio announcement | ElevenLabs API |
| `/update_status_line` | Update status display | Terminal support |

### /all_tools

Inventory of available tools:
- Built-in Claude Code tools
- MCP server tools
- Slash commands
- Active hooks

```bash
/all_tools
```

### /prime_tts

Session initialization with TTS:
- All `/prime` functionality
- Audio announcement via ElevenLabs
- Hands-free operation support

```bash
/prime_tts
```

### /update_status_line

Update terminal status display:
- Current task information
- Agent assignment
- Progress indicators

```bash
/update_status_line
```

## Installation

Commands are installed to `.claude/commands/`:

```bash
# Copy individual command
cp claude-subagents/commands/essential/prime.md .claude/commands/prime.md

# Copy all essential commands
cp claude-subagents/commands/essential/*.md .claude/commands/

# Via A.E.S - Bizzy
aes-bizzy update --component slash-commands
```

## Beads Integration

All commands integrate with Beads for context:

### Session Start
```bash
# In /prime
bd status --json
bd ready --json
```

### During Work
```bash
# In /question
bd get project-context --json
```

### Status Updates
```bash
# In /update_status_line
bd ready --json | jq '.[0]'
```

## Command Format

Commands are markdown files with:

```markdown
# Command: /name

Brief description.

## Description

Detailed explanation.

## Steps

1. First step
2. Second step
3. Third step

## Beads Integration

How command uses Beads.

## Example Output

```
Sample output
```

## Usage

```bash
/name [arguments]
```

---

*A.E.S - Bizzy Command - Category*
```

## Creating New Commands

1. Create markdown file in appropriate directory:
   ```bash
   touch claude-subagents/commands/optional/new-command.md
   ```

2. Follow the command format template

3. Add Beads integration if relevant

4. Install to `.claude/commands/`:
   ```bash
   cp claude-subagents/commands/optional/new-command.md .claude/commands/
   ```

5. Command available as `/new-command`

## Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Skills | `skills/` | Reusable skill definitions |
| Agents | `agents/` | Specialized agent prompts |
| Hooks | `hooks/` | Event-driven automation |

## Task Master Commands

Task Master provides its own set of commands in `.claude/commands/tm/`:

| Command | Description |
|---------|-------------|
| `/tm:next-task` | Get next available task |
| `/tm:list-tasks` | List all tasks |
| `/tm:expand-task` | Expand task into subtasks |

See `.claude/commands/tm/` for full list.

---

*A.E.S - Bizzy Commands System - Slash Command Definitions*
