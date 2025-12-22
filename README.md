# A.E.S - Bizzy

## Agentic Ecosystem by Bizzy - Multi-Agent Orchestration Platform for Claude Code

[![npm version](https://img.shields.io/npm/v/@bizzy211/aes-bizzy.svg)](https://www.npmjs.com/package/@bizzy211/aes-bizzy)
[![Build Status](https://img.shields.io/github/actions/workflow/status/bizzy211/aes-bizzy/ci.yml?branch=master)](https://github.com/bizzy211/aes-bizzy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/@bizzy211/aes-bizzy.svg)](https://nodejs.org)

**Ship 10x faster with coordinated AI agent teams.**

Your AI dev team that actually works together. PM-Lead orchestrates specialized agents (frontend-dev, backend-dev, ux-designer, test-engineer, and 20+ more) with seamless context handoffs via Beads. From PRD to production with TaskMaster intelligence and GitHub Issues as your AI project management hub.

## Overview

A.E.S - Bizzy is not just another CLI - it's a complete **Autonomous AI Development Ecosystem** that transforms how you build software with Claude Code. Instead of working with a single AI assistant, you orchestrate entire teams of specialized agents that collaborate like real developers.

### Multi-Agent Orchestration

- **PM-Lead**: Master orchestrator that analyzes requirements, creates PRD/PRP documents, selects optimal agent teams, and manages project lifecycle
- **Specialized Agents**: 25+ expert agents (frontend-dev, backend-dev, ux-designer, test-engineer, devops-engineer, security-expert, db-architect) that handle their domains
- **Context Handoffs**: Seamless agent-to-agent communication with Beads-powered context preservation
- **Parallel Execution**: Sync/async agent workflows for maximum productivity

### Integrated Intelligence

- **Beads Context Management**: Persistent memory across sessions - agents remember project requirements, design decisions, and conversation history
- **GitHub Issues Integration**: AI project management hub where PM-Lead creates tasks and assigns them to sub-agents
- **TaskMaster AI**: Intelligent task breakdown and workflow management from PRD to production
- **MCP Ecosystem**: Extended capabilities via Model Context Protocol servers

## How It Works: From PRD to Production

```
1. PM-Lead Analyzes Requirements
   ↓
2. Creates PRD + TaskMaster Tasks
   ↓
3. Selects Optimal Agent Team
   (frontend-dev, backend-dev, ux-designer, test-engineer)
   ↓
4. Creates GitHub Issues for Each Agent
   ↓
5. Agents Execute in Parallel/Sequence
   (with Beads context sharing)
   ↓
6. PM-Lead Validates & Integrates
   ↓
7. Deliverables Ready for Production
```

### Context-Aware Agents That Remember

Unlike traditional CLI tools, every agent in A.E.S - Bizzy has access to:

- **Project Context**: Full PRD, architecture decisions, design system via Beads
- **Conversation History**: What other agents discussed and decided
- **Task Progress**: Real-time updates from GitHub Issues and TaskMaster
- **Code Intelligence**: Deep understanding of your codebase via MCP servers

## Installation

### Quick Start (Recommended)

```bash
npx @bizzy211/aes-bizzy init
```

### Global Installation

```bash
npm install -g @bizzy211/aes-bizzy
aes-bizzy init
```

### Alternative Command

```bash
aes init
```

## Quick Start

### Initialize Your AI Development Environment

Run the interactive 7-step wizard to set up your multi-agent ecosystem:

```bash
npx @bizzy211/aes-bizzy init
```

The wizard configures your complete AI agent development environment:

1. **Prerequisites Check** - Verifies Node.js, Git, Claude CLI, GitHub CLI
2. **GitHub Authentication** - Configures GitHub access for issue management and project boards
3. **Private Repository Sync** - Syncs your custom agents, hooks, and skills
4. **Beads Installation** - Sets up persistent context/memory for agent teams
5. **Task Master Installation** - Configures AI-powered task breakdown and tracking
6. **MCP Servers Configuration** - Enables extended agent capabilities
7. **Ecosystem Finalization** - Validates and saves multi-agent configuration

### Create a Multi-Agent Project

```bash
npx @bizzy211/aes-bizzy project my-app --template web --github --taskmaster --beads
```

This creates a project where PM-Lead can orchestrate your entire development workflow.

### Check Ecosystem Health

```bash
npx @bizzy211/aes-bizzy doctor
```

## Commands

### `init`

Initialize Claude Code development environment with 7-step wizard.

```bash
aes-bizzy init [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--skip-prerequisites` | Skip prerequisites check |
| `--skip-github` | Skip GitHub authentication |
| `--skip-sync` | Skip private repository sync |
| `--skip-beads` | Skip Beads installation |
| `--skip-taskmaster` | Skip Task Master installation |
| `--skip-mcp` | Skip MCP servers configuration |
| `-y, --yes` | Accept all defaults without prompting |

### `project <name>`

Create a new project with Claude ecosystem integration.

```bash
aes-bizzy project <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-t, --template <type>` | Project template: `basic`, `web`, `api`, `fullstack` (default: `basic`) |
| `--github` | Create GitHub repository |
| `--public` | Make GitHub repository public (default: private) |
| `--taskmaster` | Initialize Task Master for task management |
| `--beads` | Initialize Beads for context tracking |
| `--skip-git` | Skip git repository initialization |
| `--force` | Overwrite existing files |
| `--dry-run` | Show what would be created without making changes |

**Example:**
```bash
# Create a fullstack project with full multi-agent orchestration
aes-bizzy project my-app \
  --template fullstack \
  --github \
  --taskmaster \
  --beads
```

### `doctor`

Check project health and diagnose issues.

```bash
aes-bizzy doctor [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--fix` | Attempt to fix detected issues |
| `--json` | Output results as JSON |
| `--verbose` | Show verbose output |
| `--categories <list>` | Only run specific categories (comma-separated) |

**Categories:**
- `prerequisites` - Check required tools
- `config` - Validate configuration files
- `agents` - Check agent installations
- `mcp` - Verify MCP servers
- `git` - Check git configuration

**Example:**
```bash
# Check and fix ecosystem issues
aes-bizzy doctor --fix --verbose
```

### `update`

Update ecosystem components to latest versions.

```bash
aes-bizzy update [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `-c, --component <type>` | Update specific component: `agents`, `hooks`, `skills`, `scripts`, `slash-commands` |
| `--all` | Update all components |
| `--dry-run` | Show what would be updated without making changes |
| `--force` | Force update even if no changes detected |

**Example:**
```bash
# Update all agent components
aes-bizzy update --all

# Update only specialized agents
aes-bizzy update -c agents
```

### `sync`

Sync configuration files with latest templates.

```bash
aes-bizzy sync [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be synced without making changes |
| `--force` | Overwrite local changes |

### Global Options

These options are available for all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Output the version number |
| `-v, --verbose` | Enable verbose output |
| `-s, --silent` | Suppress all output except errors |
| `--no-color` | Disable colored output |
| `-h, --help` | Display help for command |

## Configuration

### Ecosystem Configuration

The ecosystem configuration is stored at `~/.claude/ecosystem.json`:

```json
{
  "version": "1.0.0",
  "installedAt": "2024-01-15T12:00:00.000Z",
  "lastUpdated": "2024-01-15T12:00:00.000Z",
  "components": {
    "agents": [
      {
        "name": "debugger",
        "version": "1.0.0",
        "installedAt": "2024-01-15T12:00:00.000Z",
        "source": "local",
        "path": "~/.claude/agents/debugger.md"
      }
    ],
    "hooks": [],
    "skills": [],
    "scripts": [],
    "slash-commands": []
  },
  "mcpServers": [
    {
      "name": "supabase",
      "enabled": true,
      "config": { /* server config */ }
    }
  ],
  "settings": {
    "autoSync": false,
    "syncInterval": 3600,
    "defaultConflictStrategy": "backup",
    "backupEnabled": true,
    "maxBackups": 10
  }
}
```

### Project Configuration

Each project can have a `.project-context` file:

```json
{
  "name": "my-project",
  "ecosystem": true,
  "template": "web",
  "integrations": {
    "taskmaster": true,
    "beads": true,
    "github": true
  }
}
```

### CLAUDE.md

The `CLAUDE.md` file provides project-specific instructions to Claude:

```markdown
# Project Instructions

## Coding Standards
- Use TypeScript for all code
- Follow ESLint rules
- Write tests for new features

## Architecture
- Use React with Next.js
- State management with Zustand
- API routes in /api directory

## Custom Workflows
- Run tests before committing
- Use conventional commits
```

## Integrations: The Power of the Ecosystem

A.E.S - Bizzy's true power comes from its integrated ecosystem where every component amplifies the others.

### TaskMaster AI: From PRD to Actionable Tasks

PM-Lead uses TaskMaster to coordinate your AI development team:

```bash
# Initialize with TaskMaster integration
aes-bizzy project my-app --taskmaster

# PM-Lead parses your PRD into tasks
task-master parse-prd .taskmaster/docs/prd.md

# Agents use TaskMaster for their workflows
task-master next  # Get next task assigned to this agent
task-master show <id>  # View task details with context
task-master set-status --id=<id> --status=done
```

TaskMaster enables:
- Parse PRD documents into intelligent task hierarchies
- Analyze task complexity and recommend optimal agent assignments
- Track dependencies and blockers across the agent team
- Generate progress reports and burndown metrics

See the [Task Master documentation](https://github.com/task-master-ai/task-master) for detailed usage.

### Beads: Shared Context Across Agent Teams

Every agent in the ecosystem shares context via Beads:

```bash
# Initialize with Beads context tracking
aes-bizzy project my-app --beads

# Agents automatically use Beads for context
bd get project-requirements  # Retrieve PRD details
bd set design-tokens '{...}'  # Share design system
```

Context sharing scenarios:
- **Design System Sharing**: UX-designer creates components, frontend-dev implements them with full context
- **API Contracts**: Backend-dev defines endpoints, frontend-dev consumes them with synchronized understanding
- **Test Scenarios**: Test-engineer knows exactly what PM-Lead specified in requirements
- **Session Persistence**: Resume work days later with zero context loss

### GitHub Issues: AI Project Management Hub

PM-Lead creates and manages tasks in GitHub Issues:

```bash
# Create project with GitHub integration
aes-bizzy project my-app --github

# Agents receive issue assignments
gh issue list --assignee @me  # View assigned work
gh issue close <number>  # Complete assigned task
```

Integration features:
- Each agent gets assigned specific issues
- Sub-tasks with acceptance criteria
- Real-time progress tracking
- Automatic PR linking and closure

### MCP Servers: Extended Agent Capabilities

Specialized agents leverage MCP servers for domain expertise:

- **Supabase MCP**: db-architect and backend-dev for database operations
- **GitHub MCP**: devops-engineer for CI/CD workflows
- **Tavily MCP**: research tasks and web search capabilities
- **ElevenLabs MCP**: work-completion-summary for audio updates
- **Context7 MCP**: All agents for up-to-date library documentation

## Troubleshooting

### Prerequisites Check Failures

**Node.js not found:**
```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

**Claude CLI not found:**
```bash
npm install -g @anthropic-ai/claude-code
```

**GitHub CLI not found:**
```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh
```

### Configuration Issues

**Invalid ecosystem.json:**
```bash
# Reset configuration
aes-bizzy doctor --fix
```

**MCP server not responding:**
```bash
# Check server status
aes-bizzy doctor --categories mcp --verbose
```

### Common Errors

| Error | Solution |
|-------|----------|
| `ENOENT: ecosystem.json not found` | Run `aes-bizzy init` |
| `GitHub authentication failed` | Run `gh auth login` |
| `MCP server timeout` | Check network and API keys |
| `Invalid configuration version` | Run `aes-bizzy doctor --fix` |
| `Agent handoff failed` | Check Beads context with `bd status` |

## Programmatic Usage

The CLI can be used programmatically:

```typescript
import { runInitWizard } from '@bizzy211/aes-bizzy';

const result = await runInitWizard({
  skipPrerequisites: false,
  skipGithub: true,
  skipSync: false,
});

if (result.success) {
  console.log('Multi-agent ecosystem initialized successfully');
}
```

See the source code in `src/` for programmatic usage details.

## Development

### Setup

```bash
git clone https://github.com/bizzy211/aes-bizzy.git
cd aes-bizzy
npm install
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/cli/init.test.ts
```

### Building

```bash
npm run build
npm run typecheck
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Why A.E.S - Bizzy vs. Traditional Claude Tools?

### Traditional Approach: Single AI Assistant

```
You ↔ Claude ↔ Codebase
- Context loss between sessions
- No task specialization
- Manual coordination
- Single-threaded execution
```

### A.E.S - Bizzy: Coordinated AI Development Teams

```
You → PM-Lead → [Agent Teams] ↔ Codebase
              ↓
    ┌─────────┴─────────┐
    ↓         ↓         ↓
Frontend  Backend    UX/Test
    └─────Beads Context─────┘
         ↓
   GitHub Issues Tasks
```

**What makes A.E.S - Bizzy different:**

| Feature | Traditional | A.E.S - Bizzy |
|---------|-------------|---------------|
| Context | Lost between sessions | Persists via Beads |
| Expertise | Generalist approach | 25+ specialized agents |
| Execution | Sequential, manual | Parallel/async orchestration |
| Memory | Single conversation | Full project history |
| Task Management | Manual breakdown | TaskMaster AI intelligence |
| Project Tracking | External tools | GitHub Issues integration |

### Real-World Example

**Building a full-stack web app with traditional tools:**
1. You describe requirements to Claude
2. Claude generates frontend code
3. You copy/paste, then describe backend needs
4. Claude generates backend (may forget frontend context)
5. You manually ensure consistency
6. Repeat for tests, docs, deployment...

⏱️ **Days of back-and-forth**

**Building with A.E.S - Bizzy:**
1. PM-Lead analyzes your PRD
2. Creates GitHub Issues for: frontend-dev, backend-dev, ux-designer, test-engineer
3. Agents execute in parallel with shared Beads context
4. PM-Lead validates integration
5. Deliverables ready with tests, docs, and deployment configs

⏱️ **Hours with coordinated execution**

## FAQ

**Q: What is the difference between `init` and `project`?**

A: `init` sets up your global multi-agent ecosystem environment (tools, agents, MCP servers, Beads, TaskMaster). `project` creates a new project where PM-Lead can orchestrate agent teams.

**Q: Can I use this without GitHub?**

A: Yes, use `--skip-github` to skip GitHub authentication. However, you'll miss the AI project management features where PM-Lead assigns issues to sub-agents.

**Q: How do I add custom agents?**

A: Place agent definition files in `~/.claude/agents/` or use the private repository sync feature. PM-Lead will automatically discover and use your custom agents.

**Q: Is Task Master required?**

A: No, but highly recommended. TaskMaster enables PM-Lead to intelligently break down PRDs into tasks and assign them to the right agents.

**Q: How do I update the ecosystem?**

A: Run `aes-bizzy update --all` to update all agent components, or `aes-bizzy update -c agents` for specific updates.

**Q: How does context sharing work between agents?**

A: Beads provides a shared context layer. When UX-designer creates a design system, frontend-dev can access it. When backend-dev defines an API, frontend-dev knows the contract.

**Q: Can agents work in parallel?**

A: Yes! PM-Lead coordinates both parallel execution (independent pages) and sequential execution (design → implementation → testing).

---

Created with A.E.S - Bizzy - Ship 10x faster with coordinated AI agent teams
