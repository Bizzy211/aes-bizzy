# Claude Code Skills Library

> Jackson Holding Company - Custom Skills for the 26-Agent Ecosystem

---

## Overview

This directory contains **10 custom skills** that teach Claude how to work with the agent ecosystem and related tools.

## Installation

Copy to your Claude Code skills directory:

```powershell
# Windows
Copy-Item -Recurse skills\* C:\Users\Bizzy\.claude\skills\

# macOS/Linux
cp -r skills/* ~/.claude/skills/
```

---

## Skills Index

| # | Skill | Purpose | Key Tools |
|---|-------|---------|-----------|
| 1 | **beads** | Git-native task tracking for agents | `bd` CLI |
| 2 | **github-issues** | External visibility, PRs, milestones | GitHub MCP |
| 3 | **agent-creator** | Create new specialized agents | Templates |
| 4 | **skill-creator** | Create new skills | Templates |
| 5 | **hook-creator** | Create automation hooks | Python templates |
| 6 | **project-init** | Initialize projects with ecosystem | Multiple tools |
| 7 | **task-master** | PRD parsing, TDD autopilot | Task Master MCP |
| 8 | **exa-ai** | Semantic search & research | Exa MCP |
| 9 | **ref-tools** | Documentation lookup | Ref MCP |

---

## Skill Descriptions

### 1. beads
**File**: `beads/SKILL.md`  
**Purpose**: Teaches Claude the Beads CLI for task tracking

Key patterns:
- Session start: `bd ready --json`
- Claim work: `bd update <id> --status in_progress`
- Complete: `bd close <id> --reason "summary"`
- Agent handoff: `bd create --deps discovered-from:<id>`
- Session end: `bd sync` (CRITICAL!)

---

### 2. github-issues
**File**: `github-issues/SKILL.md`  
**Purpose**: GitHub MCP for external visibility

Key patterns:
- Create issues with templates
- Manage milestones and releases
- Pull request workflows
- Label management
- Integration with Beads

---

### 3. agent-creator
**File**: `agent-creator/SKILL.md`  
**Purpose**: Create new specialized agents

Includes:
- Full agent template
- Required sections (Identity, Tools, Workflow, Handoffs)
- Validation checklist
- Example agent definition

---

### 4. skill-creator
**File**: `skill-creator/SKILL.md`  
**Purpose**: Create new skills for Claude

Includes:
- SKILL.md template
- Directory structure
- Best practices
- Quality checklist

---

### 5. hook-creator
**File**: `hook-creator/SKILL.md`  
**Purpose**: Create automation hooks

Includes:
- Python hook template
- Pre-tool and post-tool patterns
- Common hooks (secret-scanner, beads-sync, quality-gate)
- Session hooks

---

### 6. project-init
**File**: `project-init/SKILL.md`  
**Purpose**: Initialize new projects

Covers:
- Git initialization
- Beads setup
- Task Master setup
- GitHub integration
- CLAUDE.md creation
- Project templates

---

### 7. task-master
**File**: `task-master/SKILL.md`  
**Purpose**: Task Master AI MCP usage

Covers:
- Project initialization
- PRD parsing
- Complexity analysis
- Task expansion
- TDD autopilot workflow
- Tags/branching

---

### 8. exa-ai
**File**: `exa-ai/SKILL.md`  
**Purpose**: AI-powered semantic search

Covers:
- Semantic vs keyword search
- Find similar content
- Domain filtering
- Date filtering
- Research workflows
- Token optimization

---

### 9. ref-tools
**File**: `ref-tools/SKILL.md`  
**Purpose**: Documentation lookup

Covers:
- `ref_search_documentation`
- `ref_read_url` (smart truncation)
- Session-aware context
- Token efficiency
- Integration patterns

---

## Usage

Claude automatically reads skills when relevant. Triggers include:

- **beads**: Mentions of tasks, tracking, handoffs
- **github-issues**: Mentions of issues, PRs, milestones
- **agent-creator**: "Create an agent", "new agent"
- **skill-creator**: "Create a skill", "new skill"
- **hook-creator**: "Create a hook", "automation"
- **project-init**: "New project", "initialize"
- **task-master**: "PRD", "tasks", "TDD"
- **exa-ai**: "Research", "find similar", semantic search
- **ref-tools**: "Documentation", "API docs", "how to use"

---

## Adding to Private Repo

These skills should be added to your private agent repository:

```bash
cd claude-subagents
cp -r /path/to/skills .
git add skills/
git commit -m "feat(skills): Add 10 ecosystem skills"
git push
```

Then the `@jhc/claude-ecosystem` installer will sync them automatically.

---

## Skill Dependencies

| Skill | Requires |
|-------|----------|
| beads | Beads CLI installed |
| github-issues | GitHub MCP server |
| task-master | Task Master AI MCP |
| exa-ai | Exa MCP server + API key |
| ref-tools | Ref MCP server |
| Others | No external dependencies |

---

## Version

- **Skills Version**: 1.0.0
- **Last Updated**: December 2025
- **Maintainer**: Jackson Holding Company, LLC

---

*These skills are part of the Claude Agent Ecosystem.*
