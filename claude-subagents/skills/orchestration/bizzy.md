# Bizzy - Automated Project Bootstrapping

> One-command project initialization with research, PRD generation, task creation, and agent assignment.

## Quick Start

```
/bizzy create a real-time analytics dashboard with React and Chart.js
```

## What Bizzy Does

1. **Research** - Searches exa.ai and ref.tools for design inspiration, technical docs, and code examples
2. **PRD** - Generates structured Product Requirements Document from your description
3. **Tasks** - Uses TaskMaster AI to create and expand tasks with subtasks
4. **Agents** - Matches each task to the best A.E.S agent (animated-dashboard-architect, backend-dev, etc.)
5. **GitHub** - Creates repository with labels, milestones, and issues with agent assignments

## Triggers

- `/bizzy create...` - Start a new project
- `/bizzy project...` - Start a new project
- `bizzy bootstrap...` - Start a new project

## Source Modules

- `src/bizzy/research-orchestrator.ts` - Exa.ai + Ref.tools wrapper
- `src/bizzy/prd-generator.ts` - PRD template filling
- `src/integrations/github-automation/repository-manager.ts` - GitHub API
- `src/integrations/github-automation/issue-analyzer.ts` - Agent matching

## Required Setup

```bash
# Environment variables
GITHUB_TOKEN=ghp_xxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
PERPLEXITY_API_KEY=pplx-xxxx
```

## Example Output

```
Project: Analytics Dashboard
Type: dashboard
Repository: https://github.com/bizzy211/analytics-dashboard
Tasks: 18 tasks, 54 subtasks
Agents: animated-dashboard-architect (8), backend-dev (5), db-architect (3), test-engineer (2)
```

See full documentation: `Claude Files/skills/skills/bizzy/SKILL.md`
