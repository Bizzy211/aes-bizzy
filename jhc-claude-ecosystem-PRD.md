# Product Requirements Document (PRD)

## @jhc/claude-ecosystem - Claude Code Bootstrap Package

---

**Document Version:** 1.0.0  
**Created:** December 21, 2025  
**Author:** Jackson Holding Company, LLC  
**Status:** Ready for Development  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Goals](#3-vision--goals)
4. [Reference Documents](#4-reference-documents)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Technical Specifications](#7-technical-specifications)
8. [Implementation Phases](#8-implementation-phases)
9. [Testing Requirements](#9-testing-requirements)
10. [Success Criteria](#10-success-criteria)
11. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 What We're Building

An interactive npm CLI package (`@jhc/claude-ecosystem`) that bootstraps a complete Claude Code AI agent development environment with a single command. The package installs, configures, and integrates:

- **Claude Code CLI** (if not installed)
- **26 Specialized AI Agents** (from private repository)
- **GitHub Issues Integration** (authentication + MCP)
- **Beads Context System** (git-native task tracking)
- **Task Master AI** (advanced project management)
- **40+ Automation Hooks** (pre/post tool execution)
- **Skills, Scripts, and Slash Commands**

### 1.2 Why We're Building It

Currently, setting up a full Claude Code agent ecosystem requires:
- 15+ manual installation steps
- Knowledge of multiple tools (Beads, Task Master, MCP servers)
- Private repository access configuration
- Complex settings.json editing
- Environment variable management

This package reduces setup from **hours to minutes** with guided, interactive prompts.

### 1.3 Target Users

1. **Primary:** Developer (Bizzy) setting up new machines or projects
2. **Secondary:** Team members at Jackson Holding Company
3. **Future:** Open-source community (after private components are abstracted)

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Impact | Frequency |
|------------|--------|-----------|
| Manual Claude Code installation | 10-15 min wasted | Every new machine |
| Cloning private agent repo manually | Error-prone, auth issues | Every setup |
| Configuring GitHub MCP with tokens | Security risk if done wrong | Every setup |
| Installing Beads (multiple methods) | Confusion on best approach | Every setup |
| Setting up Task Master AI | Complex MCP configuration | Every project |
| Remembering all MCP servers needed | Incomplete setups | Every project |
| Keeping components in sync | Version drift | Ongoing |

### 2.2 Current Workflow (Manual)

```
1. Check if Node.js installed (npm --version)
2. Check if Git installed (git --version)
3. Install Claude Code (npm install -g @anthropic-ai/claude-code)
4. Create GitHub PAT with correct scopes
5. Clone private repo: git clone https://github.com/bizzy211/claude-subagents
6. Copy agents to ~/.claude/agents/
7. Copy hooks to ~/.claude/hooks/
8. Copy skills to ~/.claude/skills/
9. Install Beads: winget install steveyegge.beads
10. Add GitHub MCP: claude mcp add github...
11. Add Task Master MCP: claude mcp add task-master-ai...
12. Add other MCP servers (Context7, Firecrawl, etc.)
13. Configure settings.json with tokens
14. Verify everything works
```

**Total time:** 45-90 minutes (if everything goes right)

### 2.3 Desired Workflow (Automated)

```
1. npx @jhc/claude-ecosystem init
2. Follow interactive prompts (5-10 minutes)
3. Done - everything configured and verified
```

---

## 3. Vision & Goals

### 3.1 Vision Statement

> "One command to bootstrap a production-grade AI development environment, enabling developers to go from zero to a fully configured 26-agent Claude Code ecosystem in under 10 minutes."

### 3.2 Primary Goals

| Goal | Metric | Target |
|------|--------|--------|
| Reduce setup time | Time to first "claude" command | < 10 minutes |
| Eliminate manual steps | Steps requiring copy/paste | 0 |
| Ensure consistency | Config drift between setups | 0% |
| Enable easy updates | Time to update all components | < 2 minutes |
| Provide diagnostics | Issues found by `doctor` command | 100% coverage |

### 3.3 Non-Goals (Out of Scope for v1.0)

- Web-based configuration UI
- VS Code extension
- Team/enterprise license management
- Automatic agent creation/customization
- Cloud-hosted agent registry

---

## 4. Reference Documents

### 4.1 Primary References

Two companion documents have been created that define the complete system:

#### Document 1: Claude Agent Ecosystem Guide
**Filename:** `claude-agent-ecosystem-guide.md`  
**Purpose:** Comprehensive documentation of the entire agent ecosystem  
**Contents:**
- Architecture diagrams (ASCII art)
- Component breakdown (26 agents, hooks, skills)
- Migration mapping from ProjectMgr-Context to Beads/GitHub/TaskMaster
- Tool comparison matrix with token costs
- Agent workflow patterns with Beads commands
- Configuration reference (directory structure, MCP config, env vars)
- Troubleshooting guide
- Quick reference card

**Use this document for:**
- Understanding the overall system architecture
- Knowing which tools replace which
- Agent workflow patterns to implement
- Token cost considerations

#### Document 2: @jhc/claude-ecosystem Package Design
**Filename:** `jhc-claude-ecosystem-package.md`  
**Purpose:** Complete npm package implementation specification  
**Contents:**
- CLI command structure
- Interactive flow design (7-step wizard with ASCII mockups)
- Package.json configuration
- Full source file structure
- Implementation code for key files:
  - `src/cli/init.ts`
  - `src/cli/doctor.ts`
  - `src/installers/beads.ts`
  - `src/sync/repo-sync.ts`
- Configuration file format (`ecosystem.json`)
- Publishing instructions

**Use this document for:**
- Exact CLI command syntax
- Interactive prompt flow
- Package structure
- Implementation patterns

### 4.2 External References

| Resource | URL | Purpose |
|----------|-----|---------|
| Beads GitHub | https://github.com/steveyegge/beads | Beads installation & CLI reference |
| Task Master AI | https://github.com/eyaltoledano/claude-task-master | Task Master MCP reference |
| GitHub MCP Server | https://github.com/github/github-mcp-server | GitHub integration reference |
| Claude Code Docs | https://docs.anthropic.com/claude-code | Claude Code CLI reference |
| @clack/prompts | https://github.com/natemoo-re/clack | Interactive CLI prompts library |

---

## 5. User Stories

### 5.1 Epic: Initial Setup

```
AS A developer setting up a new machine
I WANT TO run a single command to install my complete Claude Code environment
SO THAT I can start working with my AI agents immediately
```

#### Story 5.1.1: Prerequisites Check
```
AS A user running the init command
I WANT the installer to check for Node.js, Git, and Claude Code
SO THAT I know what's missing before installation begins

Acceptance Criteria:
- [ ] Checks Node.js version (>=18.0.0)
- [ ] Checks npm is available
- [ ] Checks Git is installed
- [ ] Checks if Claude Code CLI is installed
- [ ] Displays clear status for each (✅/❌)
- [ ] Offers to install Claude Code if missing
```

#### Story 5.1.2: GitHub Authentication
```
AS A user needing GitHub integration
I WANT multiple authentication options
SO THAT I can choose the method that works best for me

Acceptance Criteria:
- [ ] Option to open browser for OAuth flow
- [ ] Option to paste existing PAT
- [ ] Option to generate new token (opens GitHub)
- [ ] Option to skip (with warning about limited functionality)
- [ ] Token is securely stored in Claude Code config
- [ ] Token is validated before proceeding
```

#### Story 5.1.3: Private Repository Sync
```
AS A user with access to the private agent repo
I WANT my agents, hooks, and skills synced automatically
SO THAT I don't have to manually copy files

Acceptance Criteria:
- [ ] Authenticates to private repo using GitHub token
- [ ] Shows list of components to sync with checkboxes
- [ ] Backs up existing ~/.claude/ directory before sync
- [ ] Copies selected components to correct locations
- [ ] Reports success/failure for each component
- [ ] Handles merge conflicts gracefully
```

#### Story 5.1.4: Beads Installation
```
AS A user who needs task tracking
I WANT Beads installed with my preferred method
SO THAT I can track tasks in a git-native way

Acceptance Criteria:
- [ ] Detects operating system (Windows/macOS/Linux)
- [ ] Offers appropriate install methods per OS
- [ ] Executes installation command
- [ ] Verifies installation with `bd version`
- [ ] Optionally installs beads-mcp for MCP-only environments
```

#### Story 5.1.5: Task Master AI Setup
```
AS A user who needs project management
I WANT Task Master AI configured as an MCP server
SO THAT I can use PRD parsing and TDD workflows

Acceptance Criteria:
- [ ] Offers model selection (claude-sonnet-4, claude-opus-4, gpt-4o)
- [ ] Installs task-master-ai via claude mcp add
- [ ] Configures selected model in settings
- [ ] Verifies MCP server is responsive
```

#### Story 5.1.6: Additional MCP Servers
```
AS A user with specific tool needs
I WANT to select which MCP servers to install
SO THAT I only have what I need (reducing token usage)

Acceptance Criteria:
- [ ] Shows multi-select list of available MCP servers
- [ ] Pre-selects recommended servers (Context7, Sequential Thinking)
- [ ] Installs each selected server
- [ ] Shows token cost estimate for selections
- [ ] Verifies each server connects successfully
```

### 5.2 Epic: Maintenance

#### Story 5.2.1: Health Check (Doctor)
```
AS A user experiencing issues
I WANT to run a diagnostic command
SO THAT I can identify and fix problems

Acceptance Criteria:
- [ ] Checks all installed components
- [ ] Reports status (ok/warn/error) for each
- [ ] Provides fix commands for each issue
- [ ] Returns exit code 1 if errors found
```

#### Story 5.2.2: Update Components
```
AS A user wanting the latest versions
I WANT to update all components with one command
SO THAT I stay current without manual work

Acceptance Criteria:
- [ ] Pulls latest from private repo
- [ ] Updates Beads to latest version
- [ ] Updates MCP servers
- [ ] Shows changelog/diff of what changed
- [ ] Backs up before updating
```

### 5.3 Epic: Project Initialization

#### Story 5.3.1: New Project Setup
```
AS A user starting a new project
I WANT to initialize with full ecosystem integration
SO THAT the project is ready for AI-assisted development

Acceptance Criteria:
- [ ] Creates project directory
- [ ] Initializes Git repository
- [ ] Runs `bd init` for Beads
- [ ] Creates .project-context file
- [ ] Creates project-specific CLAUDE.md
- [ ] Optionally creates GitHub repository
- [ ] Optionally initializes Task Master
```

---

## 6. Functional Requirements

### 6.1 CLI Commands

| Command | Description | Priority |
|---------|-------------|----------|
| `init` | Full interactive setup wizard | P0 |
| `doctor` | Diagnose installation health | P0 |
| `update` | Update all components | P1 |
| `sync` | Sync with private repo only | P1 |
| `project <name>` | Initialize new project | P1 |
| `migrate` | Migrate from old system | P2 |
| `agents` | List/manage agents | P2 |
| `hooks` | List/manage hooks | P2 |

### 6.2 Init Command Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     INIT COMMAND FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  START                                                       │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────┐                                         │
│  │ Display Welcome │                                         │
│  │ Banner & Intro  │                                         │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │ Step 1:         │────►│ Install Claude  │                │
│  │ Prerequisites   │ No  │ Code CLI        │                │
│  │ Check           │     └────────┬────────┘                │
│  └────────┬────────┘              │                         │
│           │ Yes                   │                         │
│           ▼◄──────────────────────┘                         │
│  ┌─────────────────┐                                         │
│  │ Step 2:         │                                         │
│  │ GitHub Auth     │──► OAuth / PAT / Generate / Skip       │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Step 3:         │                                         │
│  │ Repo Sync       │──► Select components ──► Backup ──► Sync│
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Step 4:         │                                         │
│  │ Beads Install   │──► Select method ──► Install ──► Verify │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Step 5:         │                                         │
│  │ Task Master     │──► Select model ──► Install ──► Verify  │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Step 6:         │                                         │
│  │ MCP Servers     │──► Multi-select ──► Install each        │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Step 7:         │                                         │
│  │ Review & Run    │──► Summary ──► Execute ──► Progress     │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ Complete!       │                                         │
│  │ Show next steps │                                         │
│  └─────────────────┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Configuration Storage

After installation, create `~/.claude/ecosystem.json`:

```json
{
  "version": "1.0.0",
  "installedAt": "2025-12-21T00:00:00Z",
  "updatedAt": "2025-12-21T00:00:00Z",
  "components": {
    "agents": { "installed": true, "count": 26 },
    "hooks": { "installed": true, "count": 42 },
    "skills": { "installed": true, "count": 4 },
    "scripts": { "installed": false },
    "slashCommands": { "installed": false }
  },
  "privateRepo": {
    "url": "github.com/bizzy211/claude-subagents",
    "lastSync": "2025-12-21T00:00:00Z",
    "branch": "main"
  },
  "beads": {
    "installed": true,
    "method": "winget",
    "version": "0.32.1"
  },
  "taskMaster": {
    "installed": true,
    "model": "claude-sonnet-4"
  },
  "mcpServers": {
    "github": { "installed": true, "verified": true },
    "task-master-ai": { "installed": true, "verified": true },
    "context7": { "installed": true, "verified": true },
    "sequential-thinking": { "installed": true, "verified": true }
  },
  "github": {
    "authenticated": true,
    "username": "bizzy211"
  }
}
```

---

## 7. Technical Specifications

### 7.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | TypeScript 5.x | Type safety, modern JS features |
| Runtime | Node.js 18+ | LTS, native fetch, ESM support |
| CLI Framework | Commander.js | Industry standard, simple API |
| Interactive Prompts | @clack/prompts | Beautiful UI, great DX |
| Git Operations | simple-git | Reliable, well-maintained |
| File System | fs-extra | Extended fs with promises |
| Shell Execution | execa | Better child_process |
| Styling | chalk, gradient-string | Terminal colors |
| Progress | ora | Spinners |

### 7.2 Package Structure

```
@jhc/claude-ecosystem/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── CHANGELOG.md
│
├── bin/
│   └── claude-ecosystem.js          # Entry point (shebang)
│
├── src/
│   ├── index.ts                     # Main exports
│   ├── version.ts                   # Version constant
│   │
│   ├── cli/                         # CLI commands
│   │   ├── index.ts                 # Command registration
│   │   ├── init.ts                  # init command (main wizard)
│   │   ├── doctor.ts                # doctor command
│   │   ├── update.ts                # update command
│   │   ├── sync.ts                  # sync command
│   │   ├── project.ts               # project command
│   │   └── migrate.ts               # migrate command
│   │
│   ├── installers/                  # Installation logic
│   │   ├── prerequisites.ts         # Check Node, Git, etc.
│   │   ├── claude-code.ts           # Install Claude Code CLI
│   │   ├── github.ts                # GitHub auth & MCP
│   │   ├── beads.ts                 # Beads installation
│   │   ├── task-master.ts           # Task Master installation
│   │   └── mcp-servers.ts           # Generic MCP server installer
│   │
│   ├── sync/                        # Repository sync logic
│   │   ├── repo-sync.ts             # Clone/pull private repo
│   │   ├── backup.ts                # Backup existing config
│   │   ├── merge.ts                 # Merge configurations
│   │   └── components.ts            # Component copy logic
│   │
│   ├── config/                      # Configuration management
│   │   ├── ecosystem-config.ts      # ecosystem.json CRUD
│   │   ├── claude-settings.ts       # settings.json management
│   │   └── env.ts                   # Environment variables
│   │
│   ├── ui/                          # UI components
│   │   ├── banner.ts                # Welcome banner
│   │   ├── prompts.ts               # Reusable prompts
│   │   ├── progress.ts              # Progress indicators
│   │   └── results.ts               # Result displays
│   │
│   ├── utils/                       # Utilities
│   │   ├── platform.ts              # OS detection, paths
│   │   ├── shell.ts                 # Shell command execution
│   │   ├── logger.ts                # Logging
│   │   ├── validation.ts            # Input validation
│   │   └── errors.ts                # Error handling
│   │
│   └── types/                       # TypeScript types
│       ├── index.ts                 # Main types
│       ├── config.ts                # Config types
│       └── mcp.ts                   # MCP-related types
│
├── templates/                       # Template files
│   ├── CLAUDE.md                    # Default global CLAUDE.md
│   ├── project-context.json         # Project context template
│   └── project-claude.md            # Project-specific CLAUDE.md
│
└── tests/                           # Test files
    ├── cli/
    │   ├── init.test.ts
    │   └── doctor.test.ts
    ├── installers/
    │   ├── beads.test.ts
    │   └── github.test.ts
    └── utils/
        └── platform.test.ts
```

### 7.3 Key Implementation Details

#### 7.3.1 Platform Detection

```typescript
// src/utils/platform.ts
import os from 'os';
import path from 'path';

export interface Platform {
  os: 'windows' | 'macos' | 'linux';
  arch: 'x64' | 'arm64';
  claudeDir: string;
  tempDir: string;
  shell: string;
}

export function getPlatform(): Platform {
  const platform = os.platform();
  const arch = os.arch();
  
  let claudeDir: string;
  let shell: string;
  
  switch (platform) {
    case 'win32':
      claudeDir = path.join(os.homedir(), '.claude');
      shell = 'powershell.exe';
      return { os: 'windows', arch: arch as any, claudeDir, tempDir: os.tmpdir(), shell };
    case 'darwin':
      claudeDir = path.join(os.homedir(), '.claude');
      shell = '/bin/zsh';
      return { os: 'macos', arch: arch as any, claudeDir, tempDir: os.tmpdir(), shell };
    default:
      claudeDir = path.join(os.homedir(), '.claude');
      shell = '/bin/bash';
      return { os: 'linux', arch: arch as any, claudeDir, tempDir: os.tmpdir(), shell };
  }
}
```

#### 7.3.2 MCP Server Installation

```typescript
// src/installers/mcp-servers.ts
import { execa } from 'execa';

interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requiresAuth?: boolean;
}

const MCP_SERVERS: Record<string, MCPServerConfig> = {
  'github': {
    name: 'github',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { 'GITHUB_PERSONAL_ACCESS_TOKEN': '${GITHUB_TOKEN}' },
    requiresAuth: true,
  },
  'task-master-ai': {
    name: 'task-master-ai',
    command: 'npx',
    args: ['-y', 'task-master-ai'],
  },
  'context7': {
    name: 'context7',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
  },
  'sequential-thinking': {
    name: 'sequential-thinking',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  'firecrawl': {
    name: 'firecrawl',
    command: 'npx',
    args: ['-y', '@anthropic/firecrawl-mcp'],
    env: { 'FIRECRAWL_API_KEY': '${FIRECRAWL_API_KEY}' },
  },
  'desktop-commander': {
    name: 'desktop-commander',
    command: 'npx',
    args: ['-y', '@anthropic/desktop-commander'],
  },
};

export async function installMCPServer(
  serverId: string, 
  token?: string
): Promise<void> {
  const config = MCP_SERVERS[serverId];
  if (!config) {
    throw new Error(`Unknown MCP server: ${serverId}`);
  }
  
  // Build claude mcp add command
  const args = ['mcp', 'add', config.name, '-s', 'user'];
  
  // Add environment variables
  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      const resolvedValue = value.replace('${GITHUB_TOKEN}', token || '');
      args.push('-e', `${key}=${resolvedValue}`);
    }
  }
  
  args.push('--', config.command, ...config.args);
  
  await execa('claude', args, { stdio: 'inherit' });
}
```

#### 7.3.3 Error Handling Pattern

```typescript
// src/utils/errors.ts
export class EcosystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public fix?: string
  ) {
    super(message);
    this.name = 'EcosystemError';
  }
}

export const Errors = {
  CLAUDE_NOT_INSTALLED: new EcosystemError(
    'Claude Code CLI is not installed',
    'CLAUDE_NOT_INSTALLED',
    'npm install -g @anthropic-ai/claude-code'
  ),
  GITHUB_AUTH_FAILED: new EcosystemError(
    'GitHub authentication failed',
    'GITHUB_AUTH_FAILED',
    'Check your token has correct scopes: repo, read:org, workflow'
  ),
  PRIVATE_REPO_ACCESS_DENIED: new EcosystemError(
    'Cannot access private repository',
    'PRIVATE_REPO_ACCESS_DENIED',
    'Ensure your GitHub token has access to bizzy211/claude-subagents'
  ),
  BEADS_INSTALL_FAILED: new EcosystemError(
    'Beads installation failed',
    'BEADS_INSTALL_FAILED',
    'Try alternative method: npm install -g @beads/bd'
  ),
};
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Minimal viable installer that works end-to-end

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Project setup (package.json, tsconfig, structure) | 2h | None |
| Platform detection utility | 1h | None |
| Shell execution utility | 1h | Platform |
| Logger utility | 1h | None |
| CLI framework setup (Commander) | 2h | None |
| Basic init command scaffold | 2h | CLI framework |
| Prerequisites checker | 3h | Platform, Shell |
| Claude Code installer | 2h | Shell |

**Deliverable:** `npx @jhc/claude-ecosystem init` shows welcome, checks prerequisites, installs Claude Code

### Phase 2: GitHub & Sync (Week 2)

**Goal:** GitHub authentication and private repo sync working

| Task | Estimate | Dependencies |
|------|----------|--------------|
| GitHub OAuth flow | 4h | Shell |
| GitHub PAT validation | 2h | None |
| Backup existing config | 2h | Platform |
| Private repo clone/sync | 4h | GitHub auth |
| Component selection UI | 2h | @clack/prompts |
| Component copy logic | 3h | Sync |

**Deliverable:** Can authenticate to GitHub and sync agents/hooks from private repo

### Phase 3: Tool Installation (Week 3)

**Goal:** Beads and Task Master installation working

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Beads installer (multi-method) | 3h | Platform, Shell |
| Beads verification | 1h | Beads installer |
| Task Master MCP installer | 2h | Shell |
| Task Master verification | 1h | Task Master installer |
| Model selection UI | 1h | @clack/prompts |
| MCP server generic installer | 3h | Shell |
| MCP server verification | 2h | MCP installer |

**Deliverable:** Full init wizard completes with all tools installed

### Phase 4: Polish & Additional Commands (Week 4)

**Goal:** Production-ready with all commands

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Doctor command | 4h | All installers |
| Update command | 4h | Sync |
| Project command | 4h | Beads, Task Master |
| Progress indicators | 2h | @clack/prompts |
| Error handling polish | 3h | All |
| ecosystem.json management | 2h | Config |
| Help text and documentation | 2h | All |

**Deliverable:** All CLI commands working, polished UI

### Phase 5: Testing & Release (Week 5)

**Goal:** Tested, documented, published

| Task | Estimate | Dependencies |
|------|----------|--------------|
| Unit tests for utilities | 4h | All utilities |
| Integration tests for installers | 6h | All installers |
| E2E test on clean Windows | 4h | All |
| E2E test on clean macOS | 4h | All |
| README documentation | 3h | All |
| npm publish (private) | 1h | All tests pass |

**Deliverable:** Published to npm, tested on Windows/macOS

---

## 9. Testing Requirements

### 9.1 Unit Tests

```typescript
// tests/utils/platform.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPlatform } from '../../src/utils/platform';

describe('getPlatform', () => {
  it('detects Windows correctly', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    const platform = getPlatform();
    expect(platform.os).toBe('windows');
    expect(platform.claudeDir).toContain('.claude');
  });

  it('detects macOS correctly', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
    const platform = getPlatform();
    expect(platform.os).toBe('macos');
  });
});
```

### 9.2 Integration Tests

```typescript
// tests/installers/beads.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installBeads } from '../../src/installers/beads';
import { execa } from 'execa';

describe('installBeads', () => {
  it('installs via npm successfully', async () => {
    // This test requires network access
    await installBeads('npm');
    
    // Verify installation
    const { stdout } = await execa('bd', ['version']);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  }, 60000); // 60s timeout
});
```

### 9.3 End-to-End Test Scenarios

#### Scenario 1: Fresh Windows Install
```
Given: Clean Windows 11 machine with only Node.js installed
When: User runs `npx @jhc/claude-ecosystem init`
Then:
  - Prerequisites check shows Node ✅, Git ✅, Claude Code ❌
  - User selects "Install Claude Code"
  - Claude Code installs successfully
  - GitHub auth via PAT works
  - Private repo syncs 26 agents
  - Beads installs via winget
  - Task Master installs via MCP
  - Doctor command shows all green
```

#### Scenario 2: Existing Installation Update
```
Given: Machine with previous ecosystem installation
When: User runs `npx @jhc/claude-ecosystem update`
Then:
  - Existing config is backed up
  - Private repo pulls latest
  - Only changed files are updated
  - ecosystem.json updatedAt is refreshed
  - All components verified working
```

#### Scenario 3: Doctor Diagnoses Issues
```
Given: Machine with partial/broken installation
When: User runs `npx @jhc/claude-ecosystem doctor`
Then:
  - Each component is checked
  - Missing components show ❌ with fix command
  - Outdated components show ⚠️
  - Exit code is 1 if errors found
```

### 9.4 Test Coverage Requirements

| Area | Minimum Coverage |
|------|------------------|
| Utils | 90% |
| Installers | 80% |
| CLI Commands | 70% |
| Sync Logic | 80% |
| Overall | 80% |

---

## 10. Success Criteria

### 10.1 Functional Success

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Init completes on Windows | E2E test passes | 100% |
| Init completes on macOS | E2E test passes | 100% |
| All 26 agents synced | File count check | 26 |
| All hooks synced | File count check | 40+ |
| GitHub MCP works | `claude mcp list` shows github | ✅ |
| Beads installed | `bd version` returns | ✅ |
| Task Master works | MCP server responds | ✅ |
| Doctor finds issues | Known broken state detected | 100% |

### 10.2 Performance Success

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Init time (fast network) | End-to-end duration | < 5 min |
| Init time (slow network) | End-to-end duration | < 15 min |
| Doctor time | Command duration | < 10 sec |
| Update time | Command duration | < 2 min |

### 10.3 User Experience Success

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Zero copy/paste required | Manual steps count | 0 |
| Clear progress indication | User knows what's happening | Always |
| Graceful error handling | Errors show fix commands | Always |
| Cancellation works | Ctrl+C exits cleanly | Always |

### 10.4 Definition of Done

The project is complete when:

1. ✅ `npx @jhc/claude-ecosystem init` works on fresh Windows machine
2. ✅ `npx @jhc/claude-ecosystem init` works on fresh macOS machine
3. ✅ All 26 agents are synced and accessible in Claude Code
4. ✅ GitHub MCP is configured and can list issues
5. ✅ Beads is installed and `bd version` works
6. ✅ Task Master AI is configured and responds to MCP calls
7. ✅ `claude-ecosystem doctor` identifies all installed components
8. ✅ `claude-ecosystem update` refreshes from private repo
9. ✅ Unit test coverage is >80%
10. ✅ E2E tests pass on Windows and macOS
11. ✅ Package published to npm (private)
12. ✅ README documentation complete

---

## Appendices

### Appendix A: Private Repository Structure

The private repository (`bizzy211/claude-subagents`) should be structured:

```
claude-subagents/
├── README.md
├── agents/
│   ├── pm-lead.md
│   ├── frontend-dev.md
│   ├── backend-dev.md
│   ├── ... (26 total)
├── hooks/
│   ├── task-handoff.py
│   ├── quality-check.py
│   ├── secret-scanner.py
│   ├── beads-sync.py
│   ├── ... (40+ total)
├── skills/
│   ├── docx/
│   │   └── SKILL.md
│   ├── pptx/
│   │   └── SKILL.md
│   ├── pdf/
│   │   └── SKILL.md
│   └── xlsx/
│       └── SKILL.md
├── scripts/
│   └── ... (utility scripts)
├── slash-commands/
│   └── ... (custom commands)
├── CLAUDE.md                    # Global instructions
└── settings.template.json       # Settings template
```

### Appendix B: Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub PAT for repo access and MCP |
| `ANTHROPIC_API_KEY` | No | For Task Master (can use Claude Code's) |
| `FIRECRAWL_API_KEY` | No | For Firecrawl MCP |
| `OPENAI_API_KEY` | No | For Task Master with GPT model |

### Appendix C: MCP Server Reference

| Server | Package | Purpose |
|--------|---------|---------|
| github | @modelcontextprotocol/server-github | Issue tracking, PRs |
| task-master-ai | task-master-ai | Project management |
| context7 | @upstash/context7-mcp | Library docs |
| sequential-thinking | @modelcontextprotocol/server-sequential-thinking | Complex reasoning |
| firecrawl | @anthropic/firecrawl-mcp | Web scraping |
| desktop-commander | @anthropic/desktop-commander | System operations |
| beads | beads-mcp | Task tracking (MCP-only) |
| supabase | @supabase/mcp | Database operations |
| n8n | n8n-mcp | Workflow automation |

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Agent** | A Claude Code persona with specific tools and instructions |
| **Beads** | Git-native issue tracker optimized for AI agents |
| **Hook** | Script that runs before/after Claude Code tool execution |
| **MCP** | Model Context Protocol - standard for AI tool integration |
| **PM Lead** | Primary orchestrator agent that starts all projects |
| **PRD** | Product Requirements Document |
| **Skill** | Document creation capability (docx, pptx, etc.) |
| **Task Master** | AI-powered project management MCP server |

---

## AI Development Instructions

### For AI Agents Building This Package:

1. **Read Reference Documents First**
   - Load `claude-agent-ecosystem-guide.md` for architecture understanding
   - Load `jhc-claude-ecosystem-package.md` for implementation details

2. **Follow Implementation Phases**
   - Complete Phase 1 before starting Phase 2
   - Each phase builds on the previous
   - Test each phase before proceeding

3. **Test Continuously**
   - Write tests alongside implementation
   - Run tests after each significant change
   - E2E test on both Windows and macOS

4. **Use Provided Code Patterns**
   - The package design doc contains actual TypeScript code
   - Use those patterns as starting points
   - Maintain consistent error handling

5. **Verify Success Criteria**
   - Check off items in Section 10 as completed
   - All criteria must pass for "Definition of Done"

6. **Ask Questions If Unclear**
   - Reference specific section numbers
   - Propose alternatives if blocked
   - Document decisions made

---

*End of PRD*

**Ready for Development: ✅**
