# Agent Guide

How to create, customize, and manage Claude Code agents.

## Agent Structure

Each agent is defined as a markdown file with:

```markdown
---
name: agent-name
description: Brief description
category: core|meta|generated
tier: essential|recommended|optional
tools: [Tool1, Tool2]
mcp_servers: [server1, server2]
---

# Agent Name

## Role and Expertise
[Define the agent's primary role and areas of expertise]

## Workflow
[Define step-by-step workflow for this agent]

## Tool Usage
[Document which tools and when to use them]
```

## Creating a New Agent

1. **Copy Template**
   ```bash
   cp templates/AGENT_TEMPLATE.md agents/core/my-agent.md
   ```

2. **Customize**
   - Set unique name and description
   - Define role and expertise
   - Specify tools and MCP servers
   - Document workflow

3. **Register**
   Add to `manifests/agent-index.json`:
   ```json
   {
     "my-agent": {
       "path": "agents/core/my-agent.md",
       "category": "core",
       "tier": "recommended"
     }
   }
   ```

4. **Test**
   ```bash
   # Validate structure
   ./scripts/validate-components.sh
   ```

## Agent Categories

### Core Agents (`agents/core/`)
Production-ready, well-tested agents for common development tasks.

### Meta Agents (`agents/meta/`)
Agents that generate or modify other agents.

### Generated Agents (`agents/generated/`)
AI-generated specialized agents. May require additional testing.

## Beads Integration

Assign tasks to agents:

```bash
# Create task for specific agent
aes-bizzy beads create "Build feature X" --assign my-agent

# List agent's tasks
aes-bizzy beads ready --assigned my-agent
```

## Best Practices

1. **Single Responsibility**: Each agent should have a focused purpose
2. **Tool Limits**: List only necessary tools to reduce attack surface
3. **Clear Workflow**: Document step-by-step processes
4. **Test Strategy**: Include how to verify agent outputs
