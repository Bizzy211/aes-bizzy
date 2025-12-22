# 🚀 Claude Agent Ecosystem - Setup & Migration Guide

> **Jackson Holding Company, LLC** - Claude Code Agent Infrastructure
> Version 1.0.0 | December 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Breakdown](#component-breakdown)
4. [Installation & Setup](#installation--setup)
5. [Migration from ProjectMgr-Context](#migration-from-projectmgr-context)
6. [Agent Workflow Patterns](#agent-workflow-patterns)
7. [Tool Comparison Matrix](#tool-comparison-matrix)
8. [Configuration Reference](#configuration-reference)
9. [Troubleshooting](#troubleshooting)

---

## Executive Summary

This document describes the **Claude Agent Ecosystem** - a production-grade, 26-agent AI development team infrastructure for Claude Code. The system provides:

- **26 Specialized Agents**: From PM Lead to security experts, each with defined roles
- **GitHub Issues Integration**: External visibility, milestones, PR management
- **Beads Context System**: Git-native, dependency-aware task tracking for agents
- **Task Master AI**: Advanced project management with TDD workflows
- **Automated Bootstrap**: Single-command installation via `@jhc/claude-ecosystem`

### Why This Architecture?

| Challenge | Solution |
|-----------|----------|
| Agent context loss between sessions | Beads persists tasks in Git as JSONL |
| No external project visibility | GitHub Issues + Milestones |
| Complex multi-agent handoffs | Beads `discovered-from` dependencies |
| Token-expensive MCP schemas | Beads CLI (1-2k tokens vs 50k) |
| Manual setup complexity | `npx @jhc/claude-ecosystem init` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLAUDE AGENT ECOSYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         USER INTERFACE                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ Claude Code  │  │   VS Code    │  │  GitHub (Issues/PRs)     │   │    │
│  │  │    CLI       │  │  Extension   │  │  External Stakeholders   │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────┐    │
│  │                      ORCHESTRATION LAYER                             │    │
│  │  ┌────────────────────────────────────────────────────────────────┐ │    │
│  │  │                        PM LEAD                                  │ │    │
│  │  │  • Project initialization    • Team selection                  │ │    │
│  │  │  • PRD/PRP generation        • Quality gates                   │ │    │
│  │  │  • GitHub milestone creation • Beads epic creation             │ │    │
│  │  └────────────────────────────────────────────────────────────────┘ │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────▼───────────────────────────────────┐  │    │
│  │  │                    26 SPECIALIZED AGENTS                       │  │    │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │    │
│  │  │  │ Frontend │ │ Backend  │ │ DevOps   │ │ Security Expert  │  │  │    │
│  │  │  │   Dev    │ │   Dev    │ │ Engineer │ │                  │  │  │    │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  │    │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │    │
│  │  │  │ Test     │ │ Code     │ │ DB       │ │ + 18 more agents │  │  │    │
│  │  │  │ Engineer │ │ Reviewer │ │ Architect│ │                  │  │  │    │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────┐    │
│  │                      PERSISTENCE LAYER                               │    │
│  │                                                                      │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │   BEADS         │  │  GITHUB ISSUES  │  │   TASK MASTER AI    │  │    │
│  │  │   (Primary)     │  │  (Visibility)   │  │   (Advanced PM)     │  │    │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────────┤  │    │
│  │  │ • Daily tasks   │  │ • Milestones    │  │ • PRD parsing       │  │    │
│  │  │ • Dependencies  │  │ • Epics         │  │ • Complexity        │  │    │
│  │  │ • Blockers      │  │ • PRs           │  │ • TDD autopilot     │  │    │
│  │  │ • Agent handoff │  │ • Releases      │  │ • Tags/branches     │  │    │
│  │  │ • Context notes │  │ • External viz  │  │ • Research          │  │    │
│  │  │ • Git-backed    │  │                 │  │                     │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │    │
│  │           │                    │                     │               │    │
│  │           └────────────────────┼─────────────────────┘               │    │
│  │                                │                                     │    │
│  │                        ┌───────▼───────┐                             │    │
│  │                        │   GIT REPO    │                             │    │
│  │                        │ .beads/*.jsonl│                             │    │
│  │                        │ .taskmaster/  │                             │    │
│  │                        └───────────────┘                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      AUTOMATION LAYER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ 40+ Hooks    │  │ Skills       │  │ Slash Commands           │   │    │
│  │  │ • Pre-tool   │  │ • docx       │  │ /project, /agent         │   │    │
│  │  │ • Post-tool  │  │ • pptx       │  │ /deploy, /test           │   │    │
│  │  │ • Git hooks  │  │ • pdf        │  │                          │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Beads - Agent Memory System

**Purpose**: Distributed, git-backed issue tracker optimized for AI agents.

**Why Beads?**
- **Git-native**: Issues stored as JSONL in `.beads/`, versioned with code
- **Dependency-aware**: Track blockers, parent-child, discovered-from relationships
- **Token-efficient**: CLI uses 1-2k tokens vs 50k for MCP schemas
- **Agent-optimized**: JSON output, `bd ready` for unblocked tasks

**Key Commands**:
```bash
bd init                          # Initialize in project
bd ready --json                  # Get unblocked tasks
bd create "Task" -p 1 --json     # Create priority 1 task
bd update <id> --status in_progress
bd close <id> --reason "Done"
bd sync                          # Commit to git
```

**Data Location**: `.beads/*.jsonl` (committed to git)

---

### 2. GitHub Issues - External Visibility

**Purpose**: Stakeholder visibility, milestone tracking, PR integration.

**Integration Points**:
- Milestones map to project phases
- Epics as high-level issues
- PRs linked to Beads tasks
- Releases tracked as GitHub Releases

**MCP Tools Used**:
```javascript
mcp__github__create_issue()
mcp__github__create_milestone()
mcp__github__list_issues()
mcp__github__update_issue()
mcp__github__create_pull_request()
```

---

### 3. Task Master AI - Advanced Project Management

**Purpose**: PRD parsing, complexity analysis, TDD autopilot.

**Key Features**:
- Parse PRD documents into tasks automatically
- Analyze task complexity (1-10 scale)
- Expand tasks into subtasks
- TDD autopilot workflow (RED → GREEN → COMMIT)
- Tag-based branching for parallel work

**MCP Tools**:
```javascript
task-master-ai:parse_prd()
task-master-ai:analyze_project_complexity()
task-master-ai:expand_task()
task-master-ai:autopilot_start()
task-master-ai:next_task()
```

---

### 4. Agent Team (26 Agents)

| Category | Agents | Primary Tools |
|----------|--------|---------------|
| **Orchestration** | pm-lead, meta-agent | sequential-thinking, GitHub, Beads |
| **Development** | frontend-dev, backend-dev, mobile-dev, nextjs-senior-sme | Context7, 21st Magic, SuperDesign |
| **Splunk** | splunk-ui-dev, enhanced-splunk-ui-dev, splunk-xml-dev | Splunk-specific tooling |
| **Quality** | test-engineer, code-reviewer, lint-agent, typescript-validator | Testing frameworks |
| **Security** | security-expert | Security scanners |
| **Design** | beautiful-web-designer, animated-dashboard-architect, ux-designer | SuperDesign, Framer Motion |
| **Integration** | n8n-engineer, integration-expert | N8N MCP, API tools |
| **Docs** | docs-engineer | Markdown, docx skills |

---

### 5. Hooks System (40+)

**Location**: `~/.claude/hooks/`

| Hook | Trigger | Purpose |
|------|---------|---------|
| `task-handoff.py` | Agent switch | Log Beads handoff |
| `quality-check.py` | Code changes | Validate quality |
| `secret-scanner.py` | Pre-commit | Prevent credential leaks |
| `session-end-summary.py` | Session end | Sync Beads, capture context |
| `beads-sync.py` | Post-tool | Auto-sync on task changes |

---

## Installation & Setup

### Quick Start (Automated)

```bash
# One command to install everything
npx @jhc/claude-ecosystem init

# Follow interactive prompts for:
# 1. GitHub authentication
# 2. Private repo access
# 3. Beads initialization
# 4. Task Master setup
```

### Manual Installation

```bash
# 1. Install Claude Code (if not installed)
npm install -g @anthropic-ai/claude-code

# 2. Install Beads
winget install steveyegge.beads  # Windows
# OR: brew install steveyegge/beads/bd  # macOS
# OR: npm install -g @beads/bd

# 3. Install GitHub MCP
claude mcp add github -s user -- npx -y @modelcontextprotocol/server-github

# 4. Install Task Master AI
claude mcp add task-master-ai -s user -- npx -y task-master-ai

# 5. Clone agent ecosystem (private repo)
git clone https://github.com/bizzy211/claude-subagents.git ~/.claude/agents

# 6. Initialize project
cd your-project
bd init
task-master-ai:initialize_project
```

---

## Migration from ProjectMgr-Context

### Mapping: Old → New

| Old (ProjectMgr-Context) | New (Beads + GitHub + TaskMaster) |
|--------------------------|-----------------------------------|
| `create_project()` | `bd create` (epic) + GitHub milestone + TaskMaster init |
| `add_requirement()` | `bd create --deps parent:` |
| `track_accomplishment()` | `bd close --reason` |
| `get_project_status()` | `bd ready --json` |
| `update_task_status()` | `bd update --status` |
| `add_context_note()` | `bd update --add-note` |
| `log_agent_handoff()` | `bd create --deps discovered-from:` |
| `start_time_tracking()` | Git commit timestamp |
| `get_time_analytics()` | Beads audit trail |
| Supabase tables | `.beads/*.jsonl` + `.taskmaster/` |

### Migration Script

```bash
# Export from Supabase (run once)
npx @jhc/claude-ecosystem migrate --from supabase --to beads

# This will:
# 1. Query all ProjectMgr-Context data
# 2. Convert to Beads issues with proper dependencies
# 3. Create GitHub milestones for active projects
# 4. Archive Supabase data (optional)
```

---

## Agent Workflow Patterns

### Standard Task Flow

```
User Request
     │
     ▼
┌─────────────┐
│   PM Lead   │ ← Entry point (ALWAYS FIRST)
│             │
│ 1. bd ready │ ← Check unblocked work
│ 2. Analyze  │
│ 3. Select   │ ← Choose agent team
│    team     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         SPECIALIZED AGENT           │
│                                     │
│ 1. bd update <id> --status in_prog  │
│ 2. Execute work                     │
│ 3. bd close <id> --reason "..."     │
│ 4. bd create discovered issues      │
│ 5. bd sync                          │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────┐
│   PM Lead   │ ← Coordination
│  (Return)   │
└─────────────┘
```

### Agent CLAUDE.md Template

```markdown
## BEADS WORKFLOW (Required)

### Session Start
1. Run `bd ready --json` to see available work
2. Claim task: `bd update <id> --status in_progress`
3. Read context: `bd show <id> --json`

### During Work
- Log discoveries: `bd create "Found: X" --deps discovered-from:<current>`
- Update notes: `bd update <id> --add-note "Progress: ..."`

### Session End
1. Close completed: `bd close <id> --reason "summary"`
2. Sync to git: `bd sync`

### Handoff to Next Agent
```bash
bd create "Next: description" \
  --description "Context for next agent" \
  -p 2 \
  --deps discovered-from:<current> \
  --json
```
```

---

## Tool Comparison Matrix

### Token Cost Analysis

| Tool/Approach | Token Cost | Persistence | Git-Native | Dependencies |
|---------------|------------|-------------|------------|--------------|
| ProjectMgr-Context (old) | ~15-20k | Supabase | ❌ | Manual |
| Beads MCP | ~10-50k | Git | ✅ | ✅ |
| **Beads CLI** | **~1-2k** | Git | ✅ | ✅ |
| GitHub Issues MCP | ~5-10k | GitHub | ❌ | ❌ |
| Task Master AI | ~10-15k | Git | ✅ | ✅ |

**Recommendation**: Use Beads CLI (not MCP) + GitHub MCP + Task Master MCP.

### Feature Comparison

| Feature | Beads | GitHub Issues | Task Master |
|---------|-------|---------------|-------------|
| Daily task tracking | ✅ Primary | ❌ | ✅ |
| Dependencies/Blockers | ✅ Native | ❌ | ✅ |
| External visibility | ❌ | ✅ Primary | ❌ |
| PR integration | ❌ | ✅ | ❌ |
| PRD parsing | ❌ | ❌ | ✅ |
| Complexity analysis | ❌ | ❌ | ✅ |
| TDD workflow | ❌ | ❌ | ✅ |
| Agent handoffs | ✅ discovered-from | ❌ | ❌ |
| Git-backed | ✅ JSONL | ❌ | ✅ |

---

## Configuration Reference

### Directory Structure

```
~/.claude/
├── settings.json          # MCP servers, permissions
├── CLAUDE.md              # Global instructions
├── agents/                # 26 agent definitions
│   ├── pm-lead.md
│   ├── frontend-dev.md
│   ├── backend-dev.md
│   └── ...
├── hooks/                 # 40+ automation hooks
│   ├── task-handoff.py
│   ├── beads-sync.py
│   └── ...
├── skills/                # Document creation skills
│   ├── docx/
│   ├── pptx/
│   └── pdf/
├── scripts/               # Utility scripts
└── slash-commands/        # Custom commands
```

### MCP Server Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"]
    },
    "beads": {
      "command": "beads-mcp",
      "description": "Only for MCP-only environments"
    }
  }
}
```

### Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_xxxx                    # GitHub PAT
ANTHROPIC_API_KEY=sk-ant-xxxx            # Claude API

# Optional
BEADS_ACTOR=$USER                        # Beads audit trail
BEADS_WORKING_DIR=$PWD                   # Multi-repo support
TASKMASTER_AI_MODEL=claude-sonnet-4      # Task Master model
```

---

## Troubleshooting

### Common Issues

**Beads not syncing**:
```bash
bd sync --force
# Check daemon: bd daemon status
```

**GitHub MCP tool name too long**:
```bash
# Known issue with github-mcp-server
# Workaround: Use selective toolsets
claude mcp add github -- npx @modelcontextprotocol/server-github --toolsets repos,issues
```

**Task Master not finding project**:
```bash
# Ensure projectRoot is absolute path
task-master-ai:get_tasks --projectRoot "C:/Users/Bizzy/projects/my-project"
```

**Agent not seeing Beads data**:
```bash
# Check .beads directory exists
ls .beads/
# Re-initialize if needed
bd init --force
```

---

## Appendix A: Full Agent List

1. pm-lead
2. meta-agent
3. frontend-dev
4. backend-dev
5. mobile-dev
6. devops-engineer
7. db-architect
8. splunk-ui-dev
9. enhanced-splunk-ui-dev
10. splunk-xml-dev
11. nextjs-senior-sme
12. ue5-sme
13. test-engineer
14. code-reviewer
15. security-expert
16. lint-agent
17. typescript-validator
18. debugger
19. beautiful-web-designer
20. animated-dashboard-architect
21. ux-designer
22. visual-consistency-guardian
23. n8n-engineer
24. integration-expert
25. docs-engineer
26. [Reserved for expansion]

---

## Appendix B: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 CLAUDE ECOSYSTEM QUICK REF                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BEADS                           TASK MASTER                 │
│  ──────                          ───────────                 │
│  bd ready          Unblocked     tm next       Next task     │
│  bd create "X"     New task      tm expand     Subtasks      │
│  bd update --status Change       tm prd        Parse PRD     │
│  bd close --reason Done          tm autopilot  TDD mode      │
│  bd sync           Commit        tm status     Overview      │
│                                                              │
│  GITHUB                          PM LEAD                     │
│  ──────                          ───────                     │
│  /project new      Create        First agent always          │
│  /milestone        Track         Selects team                │
│  /pr create        Pull request  Coordinates handoffs        │
│                                                              │
│  SESSION PATTERN                                             │
│  ───────────────                                             │
│  1. bd ready → see work                                      │
│  2. bd update --status in_progress → claim                   │
│  3. [do work]                                                │
│  4. bd close --reason "done" → complete                      │
│  5. bd sync → save                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0.0*
*Last Updated: December 2025*
*Maintainer: Jackson Holding Company, LLC*
