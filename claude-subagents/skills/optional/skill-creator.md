# Skill Creator - Generate New Skills

Skill Creator for generating new reusable skills with proper structure and Beads integration.

## Overview

Create custom skills that can be used across the A.E.S - Bizzy ecosystem, with proper documentation, Beads integration, and cross-references.

## Core Workflow

### Create New Skill

```bash
# Create skill from template
/skill-creator "Create a Docker management skill"

# Create with specific category
/skill-creator "Create Terraform IaC skill" --category infrastructure

# Create with research
/skill-creator "Create GraphQL skill" --research
```

### Skill Categories

| Category | Purpose | Location |
|----------|---------|----------|
| essential | Core functionality | skills/essential/ |
| research | External API research | skills/research/ |
| optional | Specialized utilities | skills/optional/ |

## Beads Integration

### Track Skill Creation

```bash
# Create task for skill development
bd create "Create Docker management skill" --assign meta-agent

# Log progress
bd update TASK_ID --add-note "Created template with core commands"
bd update TASK_ID --add-note "Added Beads integration section"
bd update TASK_ID --add-note "Added cross-references to devops-engineer"

# Complete
bd set-status TASK_ID done
```

## Cross-References

### Related Agents
- **meta-agent**: Uses skill templates
- **docs-engineer**: Documents skills

### Related Skills
- **agent-creator**: Creates agents that use skills
- **hook-creator**: Creates hooks that complement skills

### Related Hooks
- **post_tool_use.py**: Logs skill creation

## Skill Template

```markdown
# Skill Name - Brief Description

Description of what this skill provides.

## Overview

High-level explanation of the skill's purpose.

## Core Commands

### Command Category 1

```bash
# Example command 1
command --option value

# Example command 2
another-command
```

### Command Category 2

[More commands...]

## Beads Integration

### Track Skill Usage

```bash
# Create task
bd create "Task using this skill" --assign agent-name

# Log progress
bd update TASK_ID --add-note "Progress..."

# Complete
bd set-status TASK_ID done
```

## Cross-References

### Related Agents
- **agent-name**: How this agent uses the skill

### Related Skills
- **skill-name**: How this skill complements

### Related Hooks
- **hook-name.py**: How hooks integrate

## Best Practices

1. Practice 1
2. Practice 2
3. Practice 3

---

*A.E.S - Bizzy Skill - Skill Name v1.0.0*
```

## Creation Workflow

### Step 1: Research Domain

```bash
# Use exa-ai for domain research
mcp__exa__web_search_exa "Docker CLI best practices automation"

# Use ref-tools for documentation
mcp__ref__ref_search_documentation "Docker CLI commands reference"
```

### Step 2: Create Template

```bash
# Copy template
cp claude-subagents/templates/SKILL_TEMPLATE.md \
   claude-subagents/skills/optional/docker.md

# Edit with skill-specific content
```

### Step 3: Add Beads Integration

Every skill must include:
- Task creation examples
- Progress logging examples
- Completion patterns
- Agent assignment examples

### Step 4: Add Cross-References

Link to:
- Agents that use this skill
- Complementary skills
- Related hooks

### Step 5: Install to Commands

```bash
# Copy to .claude/commands for activation
cp claude-subagents/skills/optional/docker.md \
   .claude/commands/docker.md
```

## Validation Checklist

- [ ] Clear overview and purpose
- [ ] Core commands documented
- [ ] Beads integration section
- [ ] Cross-references to agents/skills/hooks
- [ ] Best practices section
- [ ] Version footer

## Best Practices

1. **Research first** - Understand domain before creating
2. **Use template** - Maintain consistent structure
3. **Add Beads integration** - Enable task tracking
4. **Cross-reference** - Connect to ecosystem
5. **Keep focused** - One skill = one domain
6. **Document examples** - Show real usage

---

*A.E.S - Bizzy Skill - Skill Creator v1.0.0*
