# 📦 @jhc/claude-ecosystem

> **Jackson Holding Company Claude Code Bootstrap Package**
> One command to rule them all

---

## Overview

`@jhc/claude-ecosystem` is an interactive CLI tool that bootstraps a complete Claude Code agent development environment, including:

- ✅ Claude Code CLI installation verification
- ✅ Private repository sync (agents, hooks, skills, scripts)
- ✅ GitHub authentication & MCP integration
- ✅ Beads issue tracker installation & setup
- ✅ Task Master AI installation & configuration
- ✅ CCM (Claude Code Manager) integration
- ✅ Project initialization templates

---

## Installation

```bash
# Run directly (recommended)
npx @jhc/claude-ecosystem init

# Or install globally
npm install -g @jhc/claude-ecosystem
claude-ecosystem init
```

---

## CLI Commands

```
claude-ecosystem <command> [options]

Commands:
  init              Full interactive setup (recommended for new users)
  update            Update all components to latest versions
  doctor            Diagnose installation issues
  migrate           Migrate from ProjectMgr-Context to new system
  project <name>    Initialize a new project with full setup
  agents            Manage agent definitions
  hooks             Manage hooks
  sync              Sync with private repo

Options:
  --version         Show version
  --help            Show help
  --verbose, -v     Verbose output
  --skip-prompts    Use defaults (non-interactive)
  --dry-run         Show what would be done without doing it
```

---

## Interactive Flow Design

### `claude-ecosystem init`

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ╔═══════════════════════════════════════════════════════════╗     │
│   ║     🚀 CLAUDE AGENT ECOSYSTEM INSTALLER                    ║     │
│   ║         Jackson Holding Company, LLC                       ║     │
│   ╚═══════════════════════════════════════════════════════════╝     │
│                                                                      │
│   This wizard will set up your complete Claude Code                  │
│   development environment with:                                      │
│                                                                      │
│   • 26 Specialized AI Agents                                         │
│   • GitHub Issues Integration                                        │
│   • Beads Context System                                             │
│   • Task Master AI Project Management                                │
│   • 40+ Automation Hooks                                             │
│   • Skills, Scripts & Slash Commands                                 │
│                                                                      │
│   Estimated time: 5-10 minutes                                       │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Continue with setup                                      │    │
│   │    View what will be installed                              │    │
│   │    Exit                                                     │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 1: Prerequisites Check

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   📋 STEP 1/7: Prerequisites Check                                   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Checking system requirements...                                    │
│                                                                      │
│   ✅ Node.js v20.10.0 (required: >=18.0.0)                           │
│   ✅ npm v10.2.5                                                     │
│   ✅ Git v2.43.0                                                     │
│   ⏳ Claude Code CLI...                                              │
│                                                                      │
│   ❌ Claude Code CLI not found                                       │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Install Claude Code now (npm install -g @anthropic...)  │    │
│   │    I'll install it manually later                          │    │
│   │    Show installation instructions                          │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: GitHub Authentication

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🔐 STEP 2/7: GitHub Authentication                                 │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   GitHub integration enables:                                        │
│   • Issue tracking & milestones                                      │
│   • Pull request automation                                          │
│   • Repository management                                            │
│   • Access to private agent repos                                    │
│                                                                      │
│   Choose authentication method:                                      │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Login with GitHub (opens browser)                        │    │
│   │    Use existing Personal Access Token                       │    │
│   │    Generate new token (opens github.com)                    │    │
│   │    Skip GitHub setup (limited functionality)                │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Private Repo Sync

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   📥 STEP 3/7: Agent Ecosystem Sync                                  │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Syncing from: github.com/bizzy211/claude-subagents (private)       │
│                                                                      │
│   Components to install:                                             │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  [✓] Agents (26 specialized AI agents)                      │    │
│   │  [✓] Hooks (40+ automation hooks)                           │    │
│   │  [✓] Skills (docx, pptx, pdf, xlsx)                         │    │
│   │  [✓] Scripts (utility scripts)                              │    │
│   │  [✓] Slash Commands                                         │    │
│   │  [✓] Global CLAUDE.md                                       │    │
│   │  [✓] Settings template                                      │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Target directory: C:\Users\Bizzy\.claude\                          │
│                                                                      │
│   ⚠️  Existing files will be backed up to .claude.backup.{date}      │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Sync now                                                 │    │
│   │    Customize components                                     │    │
│   │    Change target directory                                  │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Beads Installation

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🔮 STEP 4/7: Beads Context System                                  │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Beads is a git-backed issue tracker optimized for AI agents.       │
│                                                                      │
│   Features:                                                          │
│   • Dependency-aware task tracking                                   │
│   • Agent handoff context preservation                               │
│   • Git-native (JSONL stored in repo)                                │
│   • Token-efficient (1-2k vs 50k for MCP)                            │
│                                                                      │
│   Installation method:                                               │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ winget install steveyegge.beads (Windows - recommended)  │    │
│   │    npm install -g @beads/bd                                 │    │
│   │    go install github.com/steveyegge/beads/cmd/bd@latest     │    │
│   │    Skip Beads installation                                  │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Also install Beads MCP server for Claude Desktop?                  │
│   (Not needed for Claude Code with CLI access)                       │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │    Yes, install beads-mcp                                   │    │
│   │  ▶ No, CLI only (recommended)                               │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 5: Task Master AI

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   📋 STEP 5/7: Task Master AI                                        │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Task Master AI provides advanced project management:               │
│                                                                      │
│   • PRD document parsing → automatic task generation                 │
│   • Task complexity analysis (1-10 scale)                            │
│   • TDD autopilot workflow (RED → GREEN → COMMIT)                    │
│   • Tag-based parallel development                                   │
│   • Research integration                                             │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Install Task Master AI MCP                               │    │
│   │    Skip (can install later)                                 │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Select AI model for Task Master:                                   │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ claude-sonnet-4 (fast, recommended)                      │    │
│   │    claude-opus-4 (most capable)                             │    │
│   │    gpt-4o (OpenAI)                                          │    │
│   │    Other (specify)                                          │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 6: Additional MCP Servers

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🔌 STEP 6/7: Additional MCP Servers                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Select additional MCP servers to install:                          │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  [✓] Context7 - Library documentation                       │    │
│   │  [✓] Sequential Thinking - Complex reasoning                │    │
│   │  [✓] Firecrawl - Web scraping                               │    │
│   │  [✓] Desktop Commander - System operations                  │    │
│   │  [ ] Supabase - Database operations                         │    │
│   │  [ ] N8N - Workflow automation                              │    │
│   │  [ ] Playwright - Browser automation                        │    │
│   │  [ ] ElevenLabs - Voice synthesis                           │    │
│   │  [ ] CCMem - Project memory                                 │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Note: Each MCP server adds to context token usage.                 │
│   Select only what you need for your workflow.                       │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Continue with selected                                   │    │
│   │    Select all                                               │    │
│   │    Select none                                              │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 7: Review & Install

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ✅ STEP 7/7: Review & Install                                      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   Installation Summary:                                              │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  COMPONENT                STATUS              ACTION        │    │
│   │  ─────────────────────────────────────────────────────────  │    │
│   │  Claude Code CLI          Not installed       Install       │    │
│   │  GitHub Integration       Authenticated       Configure     │    │
│   │  Agent Ecosystem          Ready               Sync          │    │
│   │  Beads                    Not installed       Install       │    │
│   │  Task Master AI           Not installed       Install       │    │
│   │  MCP: Context7            Not installed       Install       │    │
│   │  MCP: Sequential Think    Not installed       Install       │    │
│   │  MCP: Firecrawl           Not installed       Install       │    │
│   │  MCP: Desktop Commander   Installed           Skip          │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Estimated install time: ~3 minutes                                 │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Begin Installation                                       │    │
│   │    Go back and modify                                       │    │
│   │    Export config (install later)                            │    │
│   │    Cancel                                                   │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Installation Progress

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ⚡ INSTALLING...                                                   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│   [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 32%                     │
│                                                                      │
│   ✅ Claude Code CLI installed                                       │
│   ✅ GitHub MCP configured                                           │
│   ✅ Agent ecosystem synced (26 agents)                              │
│   ⏳ Installing Beads...                                             │
│      └─ Downloading steveyegge.beads v0.32.1                         │
│   ○ Task Master AI                                                   │
│   ○ MCP: Context7                                                    │
│   ○ MCP: Sequential Thinking                                         │
│   ○ MCP: Firecrawl                                                   │
│                                                                      │
│   Current: winget install steveyegge.beads                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Completion Screen

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ╔═══════════════════════════════════════════════════════════╗     │
│   ║     🎉 INSTALLATION COMPLETE!                              ║     │
│   ╚═══════════════════════════════════════════════════════════╝     │
│                                                                      │
│   Your Claude Agent Ecosystem is ready!                              │
│                                                                      │
│   Installed:                                                         │
│   ✅ Claude Code CLI v1.0.40                                         │
│   ✅ 26 Specialized Agents                                           │
│   ✅ 40+ Automation Hooks                                            │
│   ✅ GitHub MCP Integration                                          │
│   ✅ Beads v0.32.1                                                   │
│   ✅ Task Master AI                                                  │
│   ✅ 4 Additional MCP Servers                                        │
│                                                                      │
│   Quick Start:                                                       │
│   ─────────────                                                      │
│   1. Open a terminal in your project directory                       │
│   2. Run: claude                                                     │
│   3. Say: "Use PM Lead to start a new project"                       │
│                                                                      │
│   Useful Commands:                                                   │
│   ─────────────────                                                  │
│   claude-ecosystem doctor    Check installation health               │
│   claude-ecosystem update    Update all components                   │
│   claude-ecosystem project   Start new project                       │
│   bd quickstart              Learn Beads                             │
│                                                                      │
│   Documentation:                                                     │
│   ~/.claude/docs/ECOSYSTEM-GUIDE.md                                  │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  ▶ Start Claude Code now                                    │    │
│   │    Open documentation                                       │    │
│   │    Exit                                                     │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Package Structure

```
@jhc/claude-ecosystem/
├── package.json
├── README.md
├── LICENSE
├── bin/
│   └── claude-ecosystem.js      # CLI entry point
├── src/
│   ├── index.ts                 # Main exports
│   ├── cli/
│   │   ├── init.ts              # init command
│   │   ├── update.ts            # update command
│   │   ├── doctor.ts            # doctor command
│   │   ├── migrate.ts           # migrate command
│   │   ├── project.ts           # project command
│   │   ├── agents.ts            # agents management
│   │   ├── hooks.ts             # hooks management
│   │   └── sync.ts              # sync command
│   ├── installers/
│   │   ├── claude-code.ts       # Claude Code installer
│   │   ├── github.ts            # GitHub auth & MCP
│   │   ├── beads.ts             # Beads installer
│   │   ├── task-master.ts       # Task Master installer
│   │   └── mcp-servers.ts       # Generic MCP installer
│   ├── sync/
│   │   ├── repo-sync.ts         # Private repo sync logic
│   │   ├── backup.ts            # Backup existing config
│   │   └── merge.ts             # Merge with existing
│   ├── ui/
│   │   ├── prompts.ts           # Interactive prompts
│   │   ├── progress.ts          # Progress indicators
│   │   ├── spinner.ts           # Loading spinners
│   │   └── box.ts               # Box drawing
│   ├── utils/
│   │   ├── platform.ts          # OS detection
│   │   ├── shell.ts             # Shell command execution
│   │   ├── paths.ts             # Path utilities
│   │   ├── logger.ts            # Logging
│   │   └── config.ts            # Configuration management
│   └── types/
│       └── index.ts             # TypeScript types
├── templates/
│   ├── CLAUDE.md                # Default global instructions
│   ├── settings.json            # Default settings template
│   └── project/                 # Project templates
│       ├── .project-context
│       └── CLAUDE.md
└── tests/
    └── ...
```

---

## Implementation: Key Files

### `package.json`

```json
{
  "name": "@jhc/claude-ecosystem",
  "version": "1.0.0",
  "description": "Bootstrap your complete Claude Code agent development environment",
  "bin": {
    "claude-ecosystem": "./bin/claude-ecosystem.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli/index.ts",
    "test": "vitest",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "execa": "^8.0.1",
    "fs-extra": "^11.2.0",
    "gradient-string": "^2.0.2",
    "inquirer": "^9.2.12",
    "node-fetch": "^3.3.2",
    "ora": "^8.0.1",
    "simple-git": "^3.22.0",
    "which": "^4.0.0",
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^20.11.0",
    "@types/which": "^3.0.3",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.1"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/bizzy211/claude-ecosystem.git"
  },
  "keywords": [
    "claude",
    "claude-code",
    "ai-agents",
    "mcp",
    "beads",
    "task-master"
  ],
  "author": "Jackson Holding Company, LLC",
  "license": "MIT",
  "private": false
}
```

### `bin/claude-ecosystem.js`

```javascript
#!/usr/bin/env node

import('../dist/cli/index.js');
```

### `src/cli/index.ts`

```typescript
import { Command } from 'commander';
import { intro, outro, spinner, confirm, select, multiselect, text, note } from '@clack/prompts';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { init } from './init.js';
import { update } from './update.js';
import { doctor } from './doctor.js';
import { migrate } from './migrate.js';
import { project } from './project.js';
import { VERSION } from '../version.js';

const program = new Command();

program
  .name('claude-ecosystem')
  .description('Bootstrap your complete Claude Code agent development environment')
  .version(VERSION);

program
  .command('init')
  .description('Full interactive setup (recommended for new users)')
  .option('-v, --verbose', 'Verbose output')
  .option('--skip-prompts', 'Use defaults (non-interactive)')
  .option('--dry-run', 'Show what would be done without doing it')
  .action(init);

program
  .command('update')
  .description('Update all components to latest versions')
  .option('--agents', 'Update agents only')
  .option('--hooks', 'Update hooks only')
  .option('--mcp', 'Update MCP servers only')
  .action(update);

program
  .command('doctor')
  .description('Diagnose installation issues')
  .action(doctor);

program
  .command('migrate')
  .description('Migrate from ProjectMgr-Context to new system')
  .option('--from <source>', 'Source system (supabase)')
  .option('--to <target>', 'Target system (beads)')
  .option('--dry-run', 'Preview migration without changes')
  .action(migrate);

program
  .command('project <name>')
  .description('Initialize a new project with full setup')
  .option('-t, --template <template>', 'Project template (web, api, mobile)')
  .action(project);

program
  .command('sync')
  .description('Sync with private agent repository')
  .option('--force', 'Force overwrite local changes')
  .action(async () => {
    // Implementation
  });

// Parse and run
program.parse();
```

### `src/cli/init.ts`

```typescript
import { intro, outro, spinner, confirm, select, multiselect, text, note, cancel, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import gradient from 'gradient-string';
import { checkPrerequisites } from '../installers/prerequisites.js';
import { installClaudeCode } from '../installers/claude-code.js';
import { setupGitHub } from '../installers/github.js';
import { syncAgentRepo } from '../sync/repo-sync.js';
import { installBeads } from '../installers/beads.js';
import { installTaskMaster } from '../installers/task-master.js';
import { installMCPServers } from '../installers/mcp-servers.js';
import { backupExisting } from '../sync/backup.js';
import { getPlatform } from '../utils/platform.js';

interface InitOptions {
  verbose?: boolean;
  skipPrompts?: boolean;
  dryRun?: boolean;
}

export async function init(options: InitOptions = {}) {
  // Display welcome banner
  console.clear();
  console.log(gradient.pastel.multiline(`
╔═══════════════════════════════════════════════════════════╗
║     🚀 CLAUDE AGENT ECOSYSTEM INSTALLER                    ║
║         Jackson Holding Company, LLC                       ║
╚═══════════════════════════════════════════════════════════╝
  `));

  intro(chalk.bgCyan(' claude-ecosystem init '));

  // Step 1: Prerequisites
  note(`This wizard will set up your complete Claude Code
development environment with:

• 26 Specialized AI Agents
• GitHub Issues Integration  
• Beads Context System
• Task Master AI Project Management
• 40+ Automation Hooks

Estimated time: 5-10 minutes`, 'Welcome');

  const shouldContinue = await confirm({
    message: 'Continue with setup?',
  });

  if (isCancel(shouldContinue) || !shouldContinue) {
    cancel('Setup cancelled');
    process.exit(0);
  }

  // Step 1: Prerequisites Check
  const prereqSpinner = spinner();
  prereqSpinner.start('Checking prerequisites...');

  const prereqs = await checkPrerequisites();
  prereqSpinner.stop('Prerequisites checked');

  // Display prereq results
  const prereqLines = [
    `${prereqs.node.installed ? '✅' : '❌'} Node.js ${prereqs.node.version || 'not found'} (required: >=18.0.0)`,
    `${prereqs.npm.installed ? '✅' : '❌'} npm ${prereqs.npm.version || 'not found'}`,
    `${prereqs.git.installed ? '✅' : '❌'} Git ${prereqs.git.version || 'not found'}`,
    `${prereqs.claudeCode.installed ? '✅' : '❌'} Claude Code CLI ${prereqs.claudeCode.version || 'not found'}`,
  ];
  
  note(prereqLines.join('\n'), 'Step 1/7: Prerequisites');

  // Install Claude Code if missing
  if (!prereqs.claudeCode.installed) {
    const installCC = await confirm({
      message: 'Claude Code CLI not found. Install now?',
    });

    if (installCC) {
      const ccSpinner = spinner();
      ccSpinner.start('Installing Claude Code CLI...');
      
      if (!options.dryRun) {
        await installClaudeCode();
      }
      
      ccSpinner.stop('Claude Code CLI installed');
    }
  }

  // Step 2: GitHub Authentication
  note(`GitHub integration enables:
• Issue tracking & milestones
• Pull request automation
• Repository management
• Access to private agent repos`, 'Step 2/7: GitHub Authentication');

  const githubAuth = await select({
    message: 'Choose authentication method:',
    options: [
      { value: 'oauth', label: 'Login with GitHub (opens browser)' },
      { value: 'token', label: 'Use existing Personal Access Token' },
      { value: 'generate', label: 'Generate new token (opens github.com)' },
      { value: 'skip', label: 'Skip GitHub setup (limited functionality)' },
    ],
  });

  let githubToken: string | undefined;

  if (githubAuth === 'token') {
    githubToken = await text({
      message: 'Enter your GitHub Personal Access Token:',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
      validate: (value) => {
        if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
          return 'Invalid token format';
        }
      },
    }) as string;
  } else if (githubAuth === 'oauth') {
    const authSpinner = spinner();
    authSpinner.start('Opening browser for GitHub authentication...');
    
    if (!options.dryRun) {
      githubToken = await setupGitHub('oauth');
    }
    
    authSpinner.stop('GitHub authenticated');
  } else if (githubAuth === 'generate') {
    // Open GitHub token generation page
    const { exec } = await import('child_process');
    exec('start https://github.com/settings/tokens/new?scopes=repo,read:org,workflow');
    
    githubToken = await text({
      message: 'Paste your new token here:',
      placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    }) as string;
  }

  // Step 3: Agent Ecosystem Sync
  note(`Syncing from: github.com/bizzy211/claude-subagents (private)

Components to install:
• Agents (26 specialized AI agents)
• Hooks (40+ automation hooks)
• Skills (docx, pptx, pdf, xlsx)
• Scripts (utility scripts)
• Slash Commands
• Global CLAUDE.md
• Settings template

Target directory: ${getPlatform().claudeDir}`, 'Step 3/7: Agent Ecosystem Sync');

  const components = await multiselect({
    message: 'Select components to install:',
    options: [
      { value: 'agents', label: 'Agents (26 specialized AI agents)', hint: 'recommended' },
      { value: 'hooks', label: 'Hooks (40+ automation hooks)', hint: 'recommended' },
      { value: 'skills', label: 'Skills (docx, pptx, pdf, xlsx)', hint: 'recommended' },
      { value: 'scripts', label: 'Scripts (utility scripts)' },
      { value: 'slash-commands', label: 'Slash Commands' },
      { value: 'claude-md', label: 'Global CLAUDE.md', hint: 'recommended' },
      { value: 'settings', label: 'Settings template' },
    ],
    initialValues: ['agents', 'hooks', 'skills', 'claude-md'],
  });

  if (!options.dryRun) {
    // Backup existing
    await backupExisting();
    
    // Sync repo
    const syncSpinner = spinner();
    syncSpinner.start('Syncing agent ecosystem...');
    await syncAgentRepo(components as string[], githubToken);
    syncSpinner.stop('Agent ecosystem synced');
  }

  // Step 4: Beads Installation
  note(`Beads is a git-backed issue tracker optimized for AI agents.

Features:
• Dependency-aware task tracking
• Agent handoff context preservation
• Git-native (JSONL stored in repo)
• Token-efficient (1-2k vs 50k for MCP)`, 'Step 4/7: Beads Context System');

  const beadsMethod = await select({
    message: 'Installation method:',
    options: [
      { value: 'winget', label: 'winget install steveyegge.beads (Windows - recommended)' },
      { value: 'npm', label: 'npm install -g @beads/bd' },
      { value: 'go', label: 'go install github.com/steveyegge/beads/cmd/bd@latest' },
      { value: 'skip', label: 'Skip Beads installation' },
    ],
  });

  if (beadsMethod !== 'skip' && !options.dryRun) {
    const beadsSpinner = spinner();
    beadsSpinner.start('Installing Beads...');
    await installBeads(beadsMethod as string);
    beadsSpinner.stop('Beads installed');
  }

  // Step 5: Task Master AI
  note(`Task Master AI provides advanced project management:

• PRD document parsing → automatic task generation
• Task complexity analysis (1-10 scale)
• TDD autopilot workflow (RED → GREEN → COMMIT)
• Tag-based parallel development`, 'Step 5/7: Task Master AI');

  const installTM = await confirm({
    message: 'Install Task Master AI MCP?',
  });

  if (installTM && !options.dryRun) {
    const tmModel = await select({
      message: 'Select AI model for Task Master:',
      options: [
        { value: 'claude-sonnet-4', label: 'claude-sonnet-4 (fast, recommended)' },
        { value: 'claude-opus-4', label: 'claude-opus-4 (most capable)' },
        { value: 'gpt-4o', label: 'gpt-4o (OpenAI)' },
      ],
    });

    const tmSpinner = spinner();
    tmSpinner.start('Installing Task Master AI...');
    await installTaskMaster(tmModel as string);
    tmSpinner.stop('Task Master AI installed');
  }

  // Step 6: Additional MCP Servers
  note('Select additional MCP servers to install:', 'Step 6/7: Additional MCP Servers');

  const mcpServers = await multiselect({
    message: 'Select MCP servers:',
    options: [
      { value: 'context7', label: 'Context7 - Library documentation', hint: 'recommended' },
      { value: 'sequential-thinking', label: 'Sequential Thinking - Complex reasoning', hint: 'recommended' },
      { value: 'firecrawl', label: 'Firecrawl - Web scraping' },
      { value: 'desktop-commander', label: 'Desktop Commander - System operations' },
      { value: 'supabase', label: 'Supabase - Database operations' },
      { value: 'n8n', label: 'N8N - Workflow automation' },
      { value: 'playwright', label: 'Playwright - Browser automation' },
      { value: 'elevenlabs', label: 'ElevenLabs - Voice synthesis' },
      { value: 'ccmem', label: 'CCMem - Project memory' },
    ],
    initialValues: ['context7', 'sequential-thinking'],
  });

  if ((mcpServers as string[]).length > 0 && !options.dryRun) {
    const mcpSpinner = spinner();
    mcpSpinner.start('Installing MCP servers...');
    await installMCPServers(mcpServers as string[], githubToken);
    mcpSpinner.stop('MCP servers installed');
  }

  // Step 7: Complete
  console.log(gradient.rainbow(`
╔═══════════════════════════════════════════════════════════╗
║     🎉 INSTALLATION COMPLETE!                              ║
╚═══════════════════════════════════════════════════════════╝
  `));

  note(`Your Claude Agent Ecosystem is ready!

Quick Start:
────────────
1. Open a terminal in your project directory
2. Run: claude
3. Say: "Use PM Lead to start a new project"

Useful Commands:
────────────────
claude-ecosystem doctor    Check installation health
claude-ecosystem update    Update all components
claude-ecosystem project   Start new project
bd quickstart              Learn Beads

Documentation:
~/.claude/docs/ECOSYSTEM-GUIDE.md`, 'Complete');

  outro(chalk.green('Happy coding with your AI agent team! 🚀'));
}
```

### `src/installers/beads.ts`

```typescript
import { execa } from 'execa';
import { getPlatform } from '../utils/platform.js';
import { logger } from '../utils/logger.js';

export async function installBeads(method: string): Promise<void> {
  const platform = getPlatform();
  
  switch (method) {
    case 'winget':
      if (platform.os !== 'windows') {
        throw new Error('winget is only available on Windows');
      }
      await execa('winget', ['install', 'steveyegge.beads', '-e'], { 
        stdio: 'inherit' 
      });
      break;
      
    case 'npm':
      await execa('npm', ['install', '-g', '@beads/bd'], { 
        stdio: 'inherit' 
      });
      break;
      
    case 'go':
      await execa('go', ['install', 'github.com/steveyegge/beads/cmd/bd@latest'], { 
        stdio: 'inherit' 
      });
      break;
      
    case 'brew':
      await execa('brew', ['install', 'steveyegge/beads/bd'], { 
        stdio: 'inherit' 
      });
      break;
      
    default:
      throw new Error(`Unknown installation method: ${method}`);
  }
  
  // Verify installation
  try {
    const { stdout } = await execa('bd', ['version']);
    logger.info(`Beads installed: ${stdout}`);
  } catch {
    throw new Error('Beads installation verification failed');
  }
}

export async function initBeadsProject(projectPath: string): Promise<void> {
  await execa('bd', ['init'], { 
    cwd: projectPath,
    stdio: 'inherit' 
  });
}

export async function installBeadsMCP(): Promise<void> {
  await execa('uv', ['tool', 'install', 'beads-mcp'], {
    stdio: 'inherit'
  });
  
  // Add to Claude Code MCP
  await execa('claude', ['mcp', 'add', 'beads', '-s', 'user', '--', 'beads-mcp'], {
    stdio: 'inherit'
  });
}
```

### `src/sync/repo-sync.ts`

```typescript
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { getPlatform } from '../utils/platform.js';
import { logger } from '../utils/logger.js';

const PRIVATE_REPO = 'https://github.com/bizzy211/claude-subagents.git';

interface SyncOptions {
  components: string[];
  token?: string;
  force?: boolean;
}

export async function syncAgentRepo(
  components: string[],
  token?: string,
  options: Partial<SyncOptions> = {}
): Promise<void> {
  const platform = getPlatform();
  const targetDir = platform.claudeDir;
  const tempDir = path.join(platform.tempDir, 'claude-ecosystem-sync');
  
  // Clean temp directory
  await fs.remove(tempDir);
  await fs.ensureDir(tempDir);
  
  // Clone or pull repo
  const git: SimpleGit = simpleGit();
  
  // Build authenticated URL if token provided
  const repoUrl = token 
    ? PRIVATE_REPO.replace('https://', `https://${token}@`)
    : PRIVATE_REPO;
  
  logger.info('Cloning agent repository...');
  await git.clone(repoUrl, tempDir, ['--depth', '1']);
  
  // Sync selected components
  const componentMap: Record<string, string> = {
    'agents': 'agents',
    'hooks': 'hooks',
    'skills': 'skills',
    'scripts': 'scripts',
    'slash-commands': 'slash-commands',
    'claude-md': 'CLAUDE.md',
    'settings': 'settings.json',
  };
  
  for (const component of components) {
    const source = path.join(tempDir, componentMap[component]);
    const target = path.join(targetDir, componentMap[component]);
    
    if (await fs.pathExists(source)) {
      logger.info(`Syncing ${component}...`);
      
      if (component === 'claude-md' || component === 'settings') {
        // Single file
        await fs.copy(source, target, { overwrite: options.force });
      } else {
        // Directory
        await fs.copy(source, target, { 
          overwrite: options.force,
          filter: (src) => !src.includes('.git')
        });
      }
    } else {
      logger.warn(`Component not found in repo: ${component}`);
    }
  }
  
  // Cleanup
  await fs.remove(tempDir);
  
  logger.info('Agent ecosystem sync complete');
}
```

### `src/cli/doctor.ts`

```typescript
import { intro, note, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import { getPlatform } from '../utils/platform.js';
import fs from 'fs-extra';
import path from 'path';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: string;
}

export async function doctor() {
  intro(chalk.bgCyan(' claude-ecosystem doctor '));
  
  const s = spinner();
  s.start('Running health checks...');
  
  const checks: HealthCheck[] = [];
  const platform = getPlatform();
  
  // Check Claude Code CLI
  try {
    const { stdout } = await execa('claude', ['--version']);
    checks.push({
      name: 'Claude Code CLI',
      status: 'ok',
      message: `Installed: ${stdout.trim()}`,
    });
  } catch {
    checks.push({
      name: 'Claude Code CLI',
      status: 'error',
      message: 'Not installed',
      fix: 'npm install -g @anthropic-ai/claude-code',
    });
  }
  
  // Check Beads
  try {
    const { stdout } = await execa('bd', ['version']);
    checks.push({
      name: 'Beads',
      status: 'ok',
      message: `Installed: ${stdout.trim()}`,
    });
  } catch {
    checks.push({
      name: 'Beads',
      status: 'warn',
      message: 'Not installed (optional)',
      fix: 'winget install steveyegge.beads',
    });
  }
  
  // Check agents directory
  const agentsDir = path.join(platform.claudeDir, 'agents');
  if (await fs.pathExists(agentsDir)) {
    const agents = await fs.readdir(agentsDir);
    checks.push({
      name: 'Agent Definitions',
      status: 'ok',
      message: `${agents.length} agents found`,
    });
  } else {
    checks.push({
      name: 'Agent Definitions',
      status: 'error',
      message: 'Agents directory not found',
      fix: 'claude-ecosystem sync',
    });
  }
  
  // Check hooks directory
  const hooksDir = path.join(platform.claudeDir, 'hooks');
  if (await fs.pathExists(hooksDir)) {
    const hooks = await fs.readdir(hooksDir);
    checks.push({
      name: 'Automation Hooks',
      status: 'ok',
      message: `${hooks.length} hooks found`,
    });
  } else {
    checks.push({
      name: 'Automation Hooks',
      status: 'warn',
      message: 'Hooks directory not found',
      fix: 'claude-ecosystem sync',
    });
  }
  
  // Check MCP servers
  try {
    const { stdout } = await execa('claude', ['mcp', 'list']);
    const servers = stdout.split('\n').filter(line => line.trim());
    checks.push({
      name: 'MCP Servers',
      status: 'ok',
      message: `${servers.length} servers configured`,
    });
    
    // Check specific required servers
    const requiredServers = ['github', 'task-master-ai'];
    for (const server of requiredServers) {
      if (!stdout.includes(server)) {
        checks.push({
          name: `MCP: ${server}`,
          status: 'warn',
          message: 'Not configured',
          fix: `claude mcp add ${server} -- npx -y ${server}`,
        });
      }
    }
  } catch {
    checks.push({
      name: 'MCP Servers',
      status: 'error',
      message: 'Unable to list MCP servers',
    });
  }
  
  // Check GitHub authentication
  try {
    const settingsPath = path.join(platform.claudeDir, 'settings.json');
    if (await fs.pathExists(settingsPath)) {
      const settings = await fs.readJson(settingsPath);
      if (settings.mcpServers?.github?.env?.GITHUB_PERSONAL_ACCESS_TOKEN) {
        checks.push({
          name: 'GitHub Authentication',
          status: 'ok',
          message: 'Token configured',
        });
      } else {
        checks.push({
          name: 'GitHub Authentication',
          status: 'warn',
          message: 'Token not found in settings',
          fix: 'claude-ecosystem init (Step 2)',
        });
      }
    }
  } catch {
    checks.push({
      name: 'GitHub Authentication',
      status: 'warn',
      message: 'Unable to check settings',
    });
  }
  
  s.stop('Health checks complete');
  
  // Display results
  const statusIcon = {
    ok: chalk.green('✅'),
    warn: chalk.yellow('⚠️'),
    error: chalk.red('❌'),
  };
  
  let report = '';
  for (const check of checks) {
    report += `${statusIcon[check.status]} ${check.name}: ${check.message}\n`;
    if (check.fix) {
      report += `   ${chalk.dim('Fix:')} ${chalk.cyan(check.fix)}\n`;
    }
  }
  
  note(report, 'Health Report');
  
  const errorCount = checks.filter(c => c.status === 'error').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  
  if (errorCount > 0) {
    console.log(chalk.red(`\n${errorCount} error(s), ${warnCount} warning(s)`));
    process.exit(1);
  } else if (warnCount > 0) {
    console.log(chalk.yellow(`\n${warnCount} warning(s)`));
  } else {
    console.log(chalk.green('\n✅ All checks passed!'));
  }
}
```

---

## Additional Commands

### `claude-ecosystem project`

```bash
# Start a new project with full initialization
claude-ecosystem project my-app --template web

# This will:
# 1. Create project directory
# 2. Initialize Git repo
# 3. Initialize Beads
# 4. Create .project-context
# 5. Create initial CLAUDE.md
# 6. Initialize Task Master
# 7. Create GitHub repo (optional)
# 8. Create initial milestone
```

### `claude-ecosystem migrate`

```bash
# Migrate from ProjectMgr-Context (Supabase) to Beads
claude-ecosystem migrate --from supabase --to beads

# Preview without changes
claude-ecosystem migrate --from supabase --to beads --dry-run
```

### `claude-ecosystem update`

```bash
# Update all components
claude-ecosystem update

# Update specific components
claude-ecosystem update --agents
claude-ecosystem update --hooks
claude-ecosystem update --mcp
```

---

## Configuration File

After installation, `~/.claude/ecosystem.json` stores configuration:

```json
{
  "version": "1.0.0",
  "installed": "2025-12-21T00:00:00Z",
  "components": {
    "agents": true,
    "hooks": true,
    "skills": true,
    "scripts": false,
    "slash-commands": false
  },
  "privateRepo": "github.com/bizzy211/claude-subagents",
  "beads": {
    "installed": true,
    "method": "winget",
    "version": "0.32.1"
  },
  "taskMaster": {
    "installed": true,
    "model": "claude-sonnet-4"
  },
  "mcpServers": [
    "github",
    "task-master-ai",
    "context7",
    "sequential-thinking"
  ],
  "github": {
    "authenticated": true,
    "tokenConfigured": true
  }
}
```

---

## Publishing

```bash
# Build
npm run build

# Test locally
npm link
claude-ecosystem --help

# Publish to npm (private for now)
npm publish --access restricted

# Later, make public
npm access public @jhc/claude-ecosystem
```

---

## Future Enhancements

1. **Web UI Dashboard**: `claude-ecosystem dashboard` - browser-based management
2. **VS Code Extension**: One-click setup from VS Code
3. **Team Sync**: Share configurations across team members
4. **Agent Marketplace**: Browse and install community agents
5. **Telemetry (opt-in)**: Usage analytics for improvement
6. **Auto-updates**: Automatic component updates with changelog

---

*Package Version: 1.0.0*
*Maintainer: Jackson Holding Company, LLC*
