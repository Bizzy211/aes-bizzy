# Claude Code Subagents

Multi-agent orchestration components for Claude Code. Ship 10x faster with coordinated AI agent teams.

## Quick Start

```bash
# Install with A.E.S - Bizzy CLI
npx aes-bizzy init
```

## Structure

```
├── agents/       # Specialized AI agents (frontend-dev, backend-dev, etc.)
├── hooks/        # Event hooks for workflow automation
├── skills/       # Reusable skill definitions
├── commands/     # Slash commands for Claude Code
├── templates/    # Templates for creating new components
├── manifests/    # Installation tier configurations
├── scripts/      # Automation scripts
└── docs/         # Documentation
```

## Component Tiers

| Tier | Description |
|------|-------------|
| **Essential** | Core components for basic functionality |
| **Recommended** | Enhanced workflow with best-practice agents |
| **Full** | Complete ecosystem with all components |

## Agents (10+1 Architecture)

### Core Agents
- `pm-lead` - Project management and orchestration
- `frontend-dev` - React/Vue/Next.js development
- `backend-dev` - API and server-side development
- `db-architect` - Database design and optimization
- `devops-engineer` - CI/CD and infrastructure
- `test-engineer` - Testing and quality assurance
- `security-expert` - Security analysis and hardening
- `docs-engineer` - Documentation generation
- `code-reviewer` - Code review and quality checks
- `debugger` - Error diagnosis and resolution

### Meta Agent
- `agent-creator` - Generates new specialized agents from templates

## Integration with Beads

Tasks can be assigned to specific agents:

```bash
# Create task assigned to frontend-dev
aes-bizzy beads create "Build login form" --assign frontend-dev

# List tasks for specific agent
aes-bizzy beads ready --assigned frontend-dev
```

## Documentation

- [Agent Guide](docs/AGENT_GUIDE.md) - Creating and modifying agents
- [Beads Integration](docs/BEADS_INTEGRATION.md) - Task assignment workflow
- [Workflow Patterns](docs/WORKFLOW.md) - Multi-agent coordination

## License

MIT License - See [LICENSE](LICENSE)
