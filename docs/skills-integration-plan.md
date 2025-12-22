# A.E.S - Bizzy Skills Integration Plan

> Generated: 2025-12-22 | Task: 41.7

---

## Overview

This plan outlines the integration of skills from `Claude Files/skills/` into the A.E.S - Bizzy ecosystem with proper organization and cross-referencing.

---

## Source Analysis

### Current Location
```
S:\Projects\JHC-Claude-System\Claude Files\skills\skills\
├── beads/                     # Beads CLI workflow
│   ├── SKILL.md              # 500+ lines - comprehensive
│   └── examples/
├── task-master/               # Task Master AI integration
│   ├── SKILL.md              # 400+ lines - comprehensive
│   └── examples/
├── github-issues/             # GitHub issue tracking
│   └── SKILL.md
├── project-init/              # Project initialization
│   └── SKILL.md
├── agent-creator/             # Meta-agent skill (CRITICAL)
│   └── SKILL.md              # 500+ lines - agent templates
├── exa-ai/                    # Exa.ai research
│   └── SKILL.md
├── ref-tools/                 # Ref documentation lookup
│   └── SKILL.md
├── skill-creator/             # Create new skills
│   └── SKILL.md
└── hook-creator/              # Create new hooks
    └── SKILL.md
```

### Target Location
```
bizzy211/claude-subagents/skills/
├── essential/                  # Always installed (5 skills)
│   ├── beads/
│   ├── task-master/
│   ├── github-issues/
│   ├── project-init/
│   └── agent-creator/
├── research/                   # Research tools (2 skills)
│   ├── exa-ai/
│   └── ref-tools/
└── optional/                   # Creator skills (2 skills)
    ├── skill-creator/
    └── hook-creator/
```

---

## Skill Categories

### Essential Skills (5)

| Skill | Purpose | Integration Priority |
|-------|---------|---------------------|
| `beads` | Beads CLI workflow patterns | **CRITICAL** - Primary task management |
| `task-master` | Task Master AI integration | **CRITICAL** - AI-powered planning |
| `github-issues` | GitHub issue tracking | High - External visibility |
| `project-init` | Initialize projects | High - Project setup |
| `agent-creator` | Create specialized agents | **CRITICAL** - Meta-agent capability |

### Research Skills (2)

| Skill | Purpose | Integration Priority |
|-------|---------|---------------------|
| `exa-ai` | Semantic search, code context | High - Used by agent-creator |
| `ref-tools` | Documentation lookup | High - Used by agent-creator |

### Optional Skills (2)

| Skill | Purpose | Integration Priority |
|-------|---------|---------------------|
| `skill-creator` | Create new skills | Medium - Extensibility |
| `hook-creator` | Create new hooks | Medium - Extensibility |

---

## Skill Structure Standard

Each skill follows this structure:

```
skill-name/
├── SKILL.md                   # Main skill documentation
├── examples/                  # Usage examples (optional)
│   ├── basic.md
│   └── advanced.md
└── templates/                 # Templates (optional)
    └── template.md
```

### SKILL.md Format

```markdown
# Skill Name

> One-line description

---

## When to Use

- Condition 1
- Condition 2

---

## Quick Reference

```bash
# Essential commands
command1
command2
```

---

## Detailed Usage

### Section 1

Content...

### Section 2

Content...

---

## Integration with Other Tools

| Tool | How to Use Together |
|------|---------------------|
| Beads | ... |
| Task Master | ... |

---

## Examples

### Example 1

...

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
```

---

## Migration Tasks

### Phase 1: Essential Skills

#### beads (SKILL.md)

**Modifications:**
1. Update CLI commands to latest Beads v1.0.0 syntax
2. Add agent handoff patterns
3. Add sync workflow examples

```markdown
## BEADS WORKFLOW (REQUIRED)

### At Start of Every Task
```bash
bd ready --json                    # See available tasks
bd update ${ID} --status in_progress --json   # Claim task
bd show ${ID} --json               # Read task details
```

### During Work
```bash
bd update ${ID} --add-note "${progress}" --json  # Log progress
bd create "Found: ${issue}" --deps discovered-from:${ID} --json  # Track discoveries
```

### On Complete
```bash
bd close ${ID} --reason "${summary}" --json   # Close with summary
bd sync                             # Sync to Git
```
```

#### task-master (SKILL.md)

**Modifications:**
1. Add integration with Beads for daily tracking
2. Add TDD autopilot workflow
3. Update MCP tool references

```markdown
## Task Master + Beads Integration

Use Task Master for AI-powered planning, Beads for daily execution:

1. **Planning Phase** (Task Master)
   ```bash
   task-master parse-prd .taskmaster/docs/prd.md
   task-master analyze-complexity --research
   task-master expand --all
   ```

2. **Execution Phase** (Beads)
   ```bash
   bd create "TM Task ${ID}: ${title}" --description="$(task-master show ${ID})" --json
   bd ready --json  # Work from Beads queue
   ```

3. **Completion** (Both)
   ```bash
   task-master set-status --id=${ID} --status=done
   bd close ${BEAD_ID} --reason "TM ${ID} complete"
   bd sync
   ```
```

#### agent-creator (SKILL.md)

**Modifications:**
1. Update for 10+1 architecture
2. Add exa.ai + ref.tools research workflow
3. Add agent validation checklist

```markdown
## Agent Creation Workflow

### Step 1: Research Domain
```javascript
// Use Exa for best practices
await mcp__exa__web_search_exa("${domain} best practices 2025");

// Get code examples
await mcp__exa__get_code_context_exa("${framework} TypeScript examples");

// Check documentation
await mcp__ref__ref_search_documentation("${library} API reference");
```

### Step 2: Design Agent
```javascript
await mcp__sequential-thinking__sequentialthinking({
  thought: "Designing ${agent_name} with expertise in ${domain}...",
  nextThoughtNeeded: true
});
```

### Step 3: Generate Agent File
Use the AGENT_TEMPLATE.md and fill in:
- Identity (Role, Expertise, Personality)
- Tools (Required MCP servers, Primary/Secondary tools)
- Workflow (Beads integration, Core process)
- Handoffs (When to receive/give work)
- Quality Standards

### Step 4: Validate Agent
- [ ] Follows AGENT_TEMPLATE.md structure
- [ ] Has Beads workflow section
- [ ] Lists all required MCP tools
- [ ] Defines handoff triggers
- [ ] Includes at least 2 examples
```

---

### Phase 2: Research Skills

#### exa-ai (SKILL.md)

```markdown
# Exa AI Research Skill

> AI-powered semantic search and code context

---

## When to Use

- Researching best practices for new technologies
- Finding code examples for unfamiliar libraries
- Gathering context for agent generation

---

## Quick Reference

```javascript
// Web search
await mcp__exa__web_search_exa("Next.js 14 server actions tutorial");

// Code context
await mcp__exa__get_code_context_exa("Prisma ORM TypeScript patterns");
```

---

## Integration with Agent Creator

The agent-creator meta-agent uses Exa for:
1. Researching domain best practices
2. Finding current API patterns
3. Gathering code examples for generated agents
```

#### ref-tools (SKILL.md)

```markdown
# Ref Tools Documentation Skill

> Search and read documentation

---

## When to Use

- Looking up official documentation
- Reading API references
- Checking library usage patterns

---

## Quick Reference

```javascript
// Search documentation
await mcp__ref__ref_search_documentation("React hooks best practices");

// Read specific URL
await mcp__ref__ref_read_url("https://docs.example.com/api");
```

---

## Integration with Agent Creator

The agent-creator meta-agent uses Ref for:
1. Reading official documentation
2. Checking API specifications
3. Verifying tool usage patterns
```

---

### Phase 3: Optional Skills

#### skill-creator (SKILL.md)

```markdown
# Skill Creator

> Create new skills for the A.E.S - Bizzy ecosystem

---

## Skill Structure

```
skill-name/
├── SKILL.md           # Main documentation
├── examples/          # Usage examples (optional)
└── templates/         # Templates (optional)
```

## SKILL.md Template

See standard format above.

---

## Registration

1. Create skill in `~/.claude/skills/{skill-name}/`
2. Add to skills manifest if distributing
3. Test with Claude Code

---

*Extensibility skill for A.E.S - Bizzy*
```

#### hook-creator (SKILL.md)

```markdown
# Hook Creator

> Create new hooks for Claude Code events

---

## Hook Events

| Event | Trigger |
|-------|---------|
| SessionStart | Session begins |
| PreToolUse | Before tool call |
| PostToolUse | After tool call |
| PreCompact | Before context compaction |
| Stop | Session ends |
| SubagentStop | Subagent completes |
| UserPromptSubmit | User sends message |

---

## Hook Template

```python
#!/usr/bin/env python3
"""
Hook: {hook_name}
Event: {event_type}
Description: {description}
"""

import asyncio
from typing import Any

async def on_{event_type.lower()}(event: dict[str, Any]) -> dict[str, Any]:
    """Handle {event_type} event"""
    # Your logic here
    return {"continue": True}

if __name__ == "__main__":
    asyncio.run(on_{event_type.lower()}({}))
```

---

*Extensibility skill for A.E.S - Bizzy*
```

---

## Cross-Skill References

| Skill | References | Referenced By |
|-------|-----------|---------------|
| beads | - | task-master, agent-creator, all agents |
| task-master | beads | pm-lead, project-init |
| github-issues | beads | pm-lead |
| project-init | beads, task-master | pm-lead |
| agent-creator | exa-ai, ref-tools, beads | pm-lead, meta-agent |
| exa-ai | - | agent-creator |
| ref-tools | - | agent-creator |
| skill-creator | - | - |
| hook-creator | - | - |

---

## Installation Locations

### Global Installation
```
~/.claude/skills/
├── beads/
├── task-master/
├── github-issues/
├── project-init/
├── agent-creator/
├── exa-ai/
├── ref-tools/
├── skill-creator/
└── hook-creator/
```

### Project-Level Override
```
<project>/.claude/skills/
└── custom-skill/    # Project-specific skills
```

---

## Skill Loading in CLAUDE.md

Skills are referenced in CLAUDE.md files:

```markdown
## Skills

This project uses the following skills:

- **beads** - Beads CLI for task tracking
- **task-master** - Task Master AI for planning
- **github-issues** - GitHub issue integration

@~/.claude/skills/beads/SKILL.md
@~/.claude/skills/task-master/SKILL.md
@~/.claude/skills/github-issues/SKILL.md
```

---

## Migration Checklist

### Per-Skill Validation
- [ ] SKILL.md follows standard format
- [ ] Examples are accurate and runnable
- [ ] Cross-references are correct
- [ ] MCP tool names are current
- [ ] Beads integration documented

### Integration Validation
- [ ] All essential skills installed
- [ ] Research skills work with agent-creator
- [ ] Skills load correctly in Claude Code
- [ ] No conflicts with project-level skills

---

## File Manifest

### Essential (5 skills, 5+ files)
```
skills/essential/beads/SKILL.md
skills/essential/task-master/SKILL.md
skills/essential/github-issues/SKILL.md
skills/essential/project-init/SKILL.md
skills/essential/agent-creator/SKILL.md
```

### Research (2 skills, 2 files)
```
skills/research/exa-ai/SKILL.md
skills/research/ref-tools/SKILL.md
```

### Optional (2 skills, 2 files)
```
skills/optional/skill-creator/SKILL.md
skills/optional/hook-creator/SKILL.md
```

**Total: 9 skills, 9+ files**

---

*Skills Integration Plan - A.E.S - Bizzy*
*Task 41.7 | December 2025*
