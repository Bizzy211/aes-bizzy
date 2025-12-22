# Agent Creator - Dynamic Agent Generation

Agent Creator skill for generating new specialized agents using the meta-agent and research workflows.

## Overview

Create custom agents tailored to specific domains or project needs, using research to inform tool selection and workflow design.

## Core Commands

### Generate New Agent

```bash
# Use meta-agent to create new agent
/agent-creator "Create a Kubernetes specialist agent for container orchestration"

# Create with specific tools
/agent-creator "Create database migration agent" --tools "Bash,Read,Write,Edit"

# Create from existing pattern
/agent-creator "Create agent like backend-dev but for GraphQL"
```

### Research-Enhanced Generation

```bash
# Research best practices first
/agent-creator "Create Rust systems programming agent" --research

# Use specific research sources
/agent-creator "Create agent for AWS Lambda" --research --sources "aws-docs,exa"
```

## Beads Integration

### Track Agent Creation

```bash
# Create Beads task for agent creation
bd create "Create Kubernetes agent" --assign agent-creator

# Log research findings
bd update TASK_ID --add-note "Researched k8s best practices via exa.ai"

# Log generation completion
bd update TASK_ID --add-note "Created k8s-specialist.md with 12 tools"
bd set-status TASK_ID done
```

### Agent Assignment Workflow

```bash
# After creating new agent, test assignment
bd create "Deploy to Kubernetes cluster" --assign k8s-specialist

# Verify agent can receive tasks
bd ready --assigned k8s-specialist --json
```

## Cross-References

### Related Agents
- **meta-agent (agent-creator.md)**: Core agent generation logic
- **pm-lead**: Requests new agents for projects
- **All specialist agents**: Patterns for new agents

### Related Skills
- **exa-ai**: Research for agent capabilities
- **ref-tools**: Documentation for tool selection
- **skill-creator**: Creates skills for new agents

### Related Hooks
- **post_tool_use.py**: Logs agent creation events

## Agent Template Structure

```markdown
---
name: agent-name
description: What this agent does
tools: Tool1, Tool2, Tool3
---

# Agent Name - Brief Description

## WHEN TO USE THIS AGENT

Use this agent when:
- Condition 1
- Condition 2

## CAPABILITIES

1. **Capability 1**: Description
2. **Capability 2**: Description

## WORKFLOW

### Phase 1: Research
[Steps...]

### Phase 2: Implementation
[Steps...]

### Phase 3: Validation
[Steps...]

## BEADS INTEGRATION

### Session Start
```bash
bd ready --assigned agent-name --json
```

### Progress Updates
```bash
bd update TASK_ID --add-note "Progress..."
```

### Task Completion
```bash
bd set-status TASK_ID done
```

## CROSS-REFERENCES

- Related agents
- Related skills
- Related hooks

---

*A.E.S - Bizzy Agent - [Category]*
```

## Research Workflow

### Step 1: Domain Research

```bash
# Search for domain best practices
mcp__exa__web_search_exa "Kubernetes operator development best practices 2024"

# Get code examples
mcp__exa__get_code_context_exa "Kubernetes Go client examples"
```

### Step 2: Tool Selection

```bash
# Research available MCP tools
mcp__ref__ref_search_documentation "Claude Code MCP tools kubernetes"

# Check existing agent patterns
cat claude-subagents/agents/specialist/*.md | grep "tools:"
```

### Step 3: Template Generation

```bash
# Generate agent from template
cat claude-subagents/templates/AGENT_TEMPLATE.md | \
  sed 's/AGENT_NAME/k8s-specialist/g' > \
  claude-subagents/agents/specialist/k8s-specialist.md
```

### Step 4: Registry Update

```bash
# Add to agent-index.json
jq '.specialistAgents += [{
  "id": "k8s-specialist",
  "name": "Kubernetes Specialist",
  "path": "agents/specialist/k8s-specialist.md",
  "capabilities": ["kubernetes", "containers", "orchestration"]
}]' claude-subagents/manifests/agent-index.json > tmp.json && \
mv tmp.json claude-subagents/manifests/agent-index.json
```

## 10+1 Architecture

The agent ecosystem follows a 10+1 architecture:

| Category | Count | Purpose |
|----------|-------|---------|
| Core | 3 | Orchestration, planning, routing |
| Specialist | 7 | Domain-specific implementation |
| Meta | 1 | Agent generation and evolution |

### Adding New Specialists

New specialist agents extend the base 7 without disrupting core architecture:

```bash
# Create specialist
/agent-creator "Create mobile development specialist"

# Register in ecosystem
# Automatically added to agent-index.json

# Assign work via Beads
bd create "Build iOS app" --assign mobile-dev
```

## Best Practices

1. **Research first** - Understand domain before generating
2. **Use templates** - Maintain consistency across agents
3. **Select tools carefully** - Only include necessary tools
4. **Add Beads integration** - Enable task tracking
5. **Update registry** - Keep agent-index.json current
6. **Test with task assignment** - Verify agent can receive work

---

*A.E.S - Bizzy Skill - Agent Creator v1.0.0*
