# Skills

Reusable skill definitions for Claude Code capabilities with Beads integration.

## Directory Structure

```
skills/
├── essential/              # Core skills (5)
│   ├── beads.md           # Beads task management with --assign flag
│   ├── task-master.md     # Task Master with Beads integration
│   ├── github-issues.md   # GitHub issue workflow
│   ├── project-init.md    # Project initialization with bd init
│   └── agent-creator.md   # Meta-agent for 10+1 architecture
│
├── research/              # Research-focused skills (2)
│   ├── exa-ai.md         # Web search with mcp__exa__*
│   └── ref-tools.md      # Documentation lookup with mcp__ref__*
│
└── optional/              # Additional skills (2)
    ├── skill-creator.md  # Create new skills
    └── hook-creator.md   # Create new hooks
```

## Essential Skills (5)

Core skills that should be enabled in every project.

| Skill | Description | Key Commands |
|-------|-------------|--------------|
| **beads** | Token-efficient task management | `bd create`, `bd ready`, `bd sync` |
| **task-master** | AI-powered task management | `task-master next`, `task-master expand` |
| **github-issues** | GitHub issue workflow | `gh issue create`, `gh issue list` |
| **project-init** | Project initialization | `aes-bizzy init`, `bd init` |
| **agent-creator** | Dynamic agent generation | `/agent-creator "description"` |

### Beads Integration in Essential Skills

All essential skills include:
- Task creation with `--assign` flag for agent assignment
- Progress logging with `bd update --add-note`
- Session sync with `bd sync` before exit
- Context loading with `bd ready --json`

## Research Skills (2)

Skills for gathering external context and documentation.

| Skill | Description | MCP Tools |
|-------|-------------|-----------|
| **exa-ai** | Web search and code context | `mcp__exa__web_search_exa`, `mcp__exa__get_code_context_exa` |
| **ref-tools** | Documentation search | `mcp__ref__ref_search_documentation`, `mcp__ref__ref_read_url` |

### Research Workflow

```bash
# 1. Search for documentation
mcp__ref__ref_search_documentation "React hooks TypeScript"

# 2. Get web context
mcp__exa__web_search_exa "React 18 concurrent features 2024"

# 3. Get code examples
mcp__exa__get_code_context_exa "React custom hooks patterns"

# 4. Log findings to Beads
bd update TASK_ID --add-note "Research complete: found 8 relevant patterns"
```

## Optional Skills (2)

Skills for extending the ecosystem.

| Skill | Description | Use Case |
|-------|-------------|----------|
| **skill-creator** | Generate new skills | Creating domain-specific skills |
| **hook-creator** | Generate new hooks | Creating validation/logging hooks |

## Installing Skills

Skills are installed to `.claude/commands/` as markdown files:

```bash
# Copy individual skill
cp claude-subagents/skills/essential/beads.md .claude/commands/beads.md

# Copy all essential skills
cp claude-subagents/skills/essential/*.md .claude/commands/

# Via A.E.S - Bizzy
aes-bizzy update --component skills
```

## Using Skills

Skills are invoked via slash commands:

```bash
# Use beads skill
/beads create "Implement feature" --assign backend-dev

# Use task-master skill
/task-master next

# Use agent-creator skill
/agent-creator "Create Kubernetes specialist agent"
```

## Cross-References

Each skill includes cross-references to:
- **Related Agents**: Which agents use this skill
- **Related Skills**: Complementary skills
- **Related Hooks**: Hooks that integrate with this skill

## Skill Structure

Every skill follows this structure:

```markdown
# Skill Name - Brief Description

## Overview
High-level explanation

## Core Commands
Command examples with usage

## Beads Integration
Task tracking patterns

## Cross-References
Links to agents, skills, hooks

## Best Practices
Usage recommendations

---
*A.E.S - Bizzy Skill - Name v1.0.0*
```

## Creating New Skills

1. Use the skill-creator skill:
   ```bash
   /skill-creator "Create Docker management skill"
   ```

2. Or manually:
   ```bash
   cp claude-subagents/templates/SKILL_TEMPLATE.md \
      claude-subagents/skills/optional/new-skill.md
   ```

3. Follow the skill structure template

4. Add Beads integration section

5. Add cross-references

See [skill-creator.md](optional/skill-creator.md) for detailed instructions.

## Beads Integration Patterns

### Session Start

```bash
# Load context
bd ready --json

# Filter by agent
bd ready --assigned backend-dev --json
```

### During Work

```bash
# Log progress
bd update TASK_ID --add-note "Completed step 1"

# Update status
bd set-status TASK_ID in-progress
```

### Session End

```bash
# CRITICAL: Always sync before exit
bd sync
```

### Agent Handoff

```bash
# Reassign task
bd reassign TASK_ID --to frontend-dev

# Log handoff
bd update TASK_ID --add-note "Backend complete, ready for frontend"
```

## Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Agents | `agents/` | Use skills for specialized work |
| Hooks | `hooks/` | Validate and log skill usage |
| Templates | `templates/` | Skill creation templates |
| Manifests | `manifests/` | Skill registry |

---

*A.E.S - Bizzy Skills System - Reusable Capability Definitions*
