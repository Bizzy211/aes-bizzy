# Agents

Specialized AI agents for Claude Code multi-agent orchestration.

## Directory Structure

```
agents/
├── core/       # Core agents (10 specialized agents)
├── meta/       # Meta-agent for generating new agents
└── generated/  # AI-generated specialized agents
```

## Core Agents

| Agent | Expertise | Primary Use |
|-------|-----------|-------------|
| pm-lead | Project management | Task planning, orchestration |
| frontend-dev | React, Vue, Next.js | UI/UX implementation |
| backend-dev | APIs, Node.js, Python | Server-side development |
| db-architect | SQL, NoSQL, migrations | Database design |
| devops-engineer | CI/CD, Docker, K8s | Infrastructure |
| test-engineer | Jest, Playwright, TDD | Testing |
| security-expert | OWASP, auditing | Security analysis |
| docs-engineer | Technical writing | Documentation |
| code-reviewer | Code quality | Review and refactoring |
| debugger | Error analysis | Troubleshooting |

## Agent Assignment via Beads

```bash
# Assign task to agent during creation
aes-bizzy beads create "Implement OAuth" --assign backend-dev

# Filter ready tasks by agent
aes-bizzy beads ready --assigned backend-dev
```

## Creating New Agents

Use the meta-agent or template:

1. Copy `../templates/AGENT_TEMPLATE.md`
2. Customize role, expertise, and workflow
3. Place in appropriate directory (`core/`, `meta/`, or `generated/`)
4. Register in `../manifests/agent-index.json`

See [AGENT_GUIDE.md](../docs/AGENT_GUIDE.md) for detailed instructions.
