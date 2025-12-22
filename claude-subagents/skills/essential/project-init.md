# Project Init - Project Initialization Workflow

Project initialization skill that sets up Beads, Task Master, and agent infrastructure for new projects.

## Overview

Automates project setup with proper structure for multi-agent development, task tracking, and hook integration.

## Core Commands

### Full Project Initialization

```bash
# Initialize complete A.E.S - Bizzy project
aes-bizzy init

# Initialize with specific components
aes-bizzy init --components beads,taskmaster,hooks

# Initialize in existing project
aes-bizzy init --existing
```

### Component-Specific Initialization

```bash
# Initialize Beads only
bd init

# Initialize Task Master only
task-master init

# Initialize hooks directory
mkdir -p .claude/hooks/{essential,recommended,optional}
```

### PRD Setup

```bash
# Create PRD from template
cp .taskmaster/templates/example_prd.md .taskmaster/docs/prd.md

# Parse PRD to generate tasks
task-master parse-prd .taskmaster/docs/prd.md --research
```

## Beads Integration

### Initialize Beads with Project Context

```bash
# Initialize Beads
bd init

# Set project metadata
bd set project-name "My Project"
bd set project-type "web-application"

# Create initial project tasks
bd create "Set up development environment" --assign devops-engineer --priority high
bd create "Define project architecture" --assign pm-lead --priority high
```

### Session Start with Beads

```bash
# Load Beads context at session start
bd ready --json

# Check for stale tasks
bd stale --json

# Restore session state
bd restore-session
```

## Cross-References

### Related Agents
- **pm-lead**: Initiates projects and creates PRDs
- **devops-engineer**: Sets up CI/CD and infrastructure
- **meta-agent**: Creates project-specific agents

### Related Skills
- **beads**: Task tracking initialized by this skill
- **task-master**: Project management initialized by this skill
- **agent-creator**: Creates custom agents for project

### Related Hooks
- **session_start.py**: Uses initialization state
- **pre_tool_use.py**: Validates project structure

## Project Structure

```
project/
├── .taskmaster/
│   ├── tasks/
│   │   └── tasks.json
│   ├── docs/
│   │   └── prd.md
│   ├── reports/
│   └── config.json
├── .claude/
│   ├── settings.json
│   ├── commands/
│   └── hooks/
│       ├── essential/
│       ├── recommended/
│       └── optional/
├── .beads/
│   ├── tasks.json
│   └── config.json
├── .mcp.json
├── .env
└── CLAUDE.md
```

## Initialization Workflow

### Step 1: Create Project Structure

```bash
# Create directories
mkdir -p .taskmaster/{tasks,docs,reports,templates}
mkdir -p .claude/{commands,hooks/{essential,recommended,optional}}
mkdir -p .beads
```

### Step 2: Initialize Task Master

```bash
task-master init
# Creates .taskmaster/config.json
# Creates .taskmaster/tasks/tasks.json
```

### Step 3: Initialize Beads

```bash
bd init
# Creates .beads/config.json
# Creates .beads/tasks.json
```

### Step 4: Set Up Hooks

```bash
# Copy essential hooks
cp claude-subagents/hooks/essential/* .claude/hooks/essential/

# Configure hooks in settings.json
cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PreToolUse": [{"matcher": "*", "hooks": ["./.claude/hooks/essential/pre_tool_use.py"]}],
    "Stop": [{"matcher": "*", "hooks": ["./.claude/hooks/essential/stop.py"]}]
  }
}
EOF
```

### Step 5: Create CLAUDE.md

```bash
# Create project instructions
cat > CLAUDE.md << 'EOF'
# Project Instructions

## Task Management
@./.taskmaster/CLAUDE.md

## Beads Integration
Use `bd` commands for task tracking with agent assignment.

## Available Agents
- pm-lead: Project management
- backend-dev: Backend development
- frontend-dev: Frontend development
- debugger: Bug fixing
EOF
```

## Configuration Templates

### .mcp.json Template

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### .env Template

```bash
# AI API Keys
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here

# Optional API Keys
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

## Best Practices

1. **Initialize early** - Set up structure before coding
2. **Use PRD** - Define requirements before tasks
3. **Configure hooks** - Enable automation from start
4. **Set up Beads** - Enable multi-agent coordination
5. **Document in CLAUDE.md** - Provide agent context

---

*A.E.S - Bizzy Skill - Project Initialization v1.0.0*
