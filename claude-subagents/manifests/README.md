# Installation Manifests

Deployment manifests for different A.E.S - Bizzy installation tiers.

## Available Manifests

| Manifest | Files | Description | Target Users |
|----------|-------|-------------|--------------|
| **essential.json** | ~30 | MVP installation | Individual developers |
| **recommended.json** | ~52 | Production installation | Development teams |
| **full.json** | ~61 | Complete ecosystem | Enterprise teams |

## Manifest Structure

```
manifests/
├── agent-index.json    # Agent registry with capabilities
├── essential.json      # MVP installation manifest
├── recommended.json    # Production installation manifest
└── full.json          # Complete installation manifest
```

## Essential Manifest (30 files)

Minimal installation for basic Claude Code development:

- **4 Core Agents**: pm-lead, frontend-dev, backend-dev, debugger
- **8 Essential Hooks**: Security and context management
- **10 Utility Modules**: LLM and TTS integrations
- **3 Essential Skills**: beads, task-master, github-issues
- **3 Essential Commands**: prime, git_status, question

```bash
aes-bizzy install --manifest essential
```

## Recommended Manifest (52 files)

Production-ready installation with full agent team:

- **9 Core Agents**: Full development team
- **21 Hooks**: Essential + recommended validation hooks
- **7 Skills**: Essential + research skills
- **4 Commands**: Essential + all_tools

```bash
aes-bizzy install --manifest recommended
```

## Full Manifest (61 files)

Complete ecosystem with all capabilities:

- **11 Agents**: 10 core + meta-agent
- **26 Hooks**: All hook categories
- **9 Skills**: All skill categories
- **6 Commands**: All command categories
- **Documentation**: Complete guides

```bash
aes-bizzy install --manifest full
```

## Manifest Schema

```json
{
  "name": "manifest-name",
  "version": "1.0.0",
  "description": "Manifest description",
  "totalFiles": 30,
  "extends": "parent-manifest or null",
  "components": {
    "agents": {
      "path": "agents/core/",
      "files": ["agent1.md", "agent2.md"],
      "count": 2,
      "description": "Component description"
    }
  },
  "categories": ["essential"],
  "requiredTools": ["bd", "task-master"],
  "requiredMcpServers": ["task-master-ai"],
  "optionalMcpServers": ["exa", "ref"],
  "installOrder": ["manifests", "templates", "agents"],
  "postInstall": ["bd init", "task-master init"],
  "metadata": {
    "created": "2024-12-22",
    "tier": "essential",
    "targetUsers": "Description",
    "estimatedSetupTime": "5 minutes"
  }
}
```

## Installation Order

Components are installed in this order:

1. **manifests** - Registry and metadata
2. **templates** - Project templates
3. **docs** - Documentation (full only)
4. **utils** - Utility modules
5. **hooks** - Event-driven hooks
6. **agents** - Agent definitions
7. **skills** - Skill definitions
8. **commands** - Slash commands

## Post-Install Steps

After installation, these commands run:

```bash
# Essential
bd init                    # Initialize Beads
task-master init           # Initialize Task Master

# Recommended
task-master models --setup # Configure AI models

# Full
aes-bizzy validate         # Validate installation
```

## Comparing Tiers

| Feature | Essential | Recommended | Full |
|---------|-----------|-------------|------|
| Core Agents | 4 | 9 | 10 |
| Meta-Agent | - | - | ✓ |
| Essential Hooks | ✓ | ✓ | ✓ |
| Recommended Hooks | - | ✓ | ✓ |
| Optional Hooks | - | - | ✓ |
| Research Skills | - | ✓ | ✓ |
| Creator Skills | - | - | ✓ |
| TTS Commands | - | - | ✓ |
| Documentation | - | - | ✓ |

## Required Tools

All tiers require:
- `bd` - Beads CLI for task management
- `task-master` - Task Master CLI
- `gh` - GitHub CLI

## MCP Server Requirements

| Server | Essential | Recommended | Full |
|--------|-----------|-------------|------|
| task-master-ai | Required | Required | Required |
| context7 | Optional | Required | Required |
| sequential-thinking | Optional | Required | Required |
| exa | Optional | Optional | Required |
| ref | Optional | Optional | Required |
| elevenlabs | Optional | Optional | Optional |
| supabase-server | - | Optional | Optional |

## Agent Index

The `agent-index.json` file contains:

```json
{
  "version": "1.0.0",
  "coreAgents": [...],
  "metaAgent": {...},
  "generatedAgents": [],
  "stats": {
    "totalAgents": 11
  }
}
```

This registry is used by:
- `/prime` command to display available agents
- Agent router for task delegation
- Meta-agent for understanding ecosystem

## Custom Manifests

Create custom manifests by extending existing ones:

```json
{
  "name": "custom",
  "extends": "recommended",
  "components": {
    "agents": {
      "files": [
        ...inherited files,
        "custom/my-agent.md"
      ]
    }
  }
}
```

---

*A.E.S - Bizzy Manifests - Installation Configuration*
