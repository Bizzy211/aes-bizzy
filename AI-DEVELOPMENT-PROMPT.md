# AI Development Prompt: Build @jhc/claude-ecosystem

## 🎯 OBJECTIVE

You are tasked with building `@jhc/claude-ecosystem`, an npm CLI package that bootstraps a complete Claude Code AI agent development environment with a single command. This package will install Claude Code, sync 26 specialized agents from a private repository, configure GitHub integration, install Beads task tracking, set up Task Master AI, and configure additional MCP servers.

---

## 📚 REFERENCE DOCUMENTS

You have access to three comprehensive reference documents. **Read these first before writing any code:**

### Document 1: Claude Agent Ecosystem Guide
**File:** `claude-agent-ecosystem-guide.md`
**Contains:**
- Complete system architecture (ASCII diagrams)
- Component breakdown (26 agents, 40+ hooks, skills)
- Migration mapping from old ProjectMgr-Context to new system
- Tool comparison matrix with token costs
- Agent workflow patterns using Beads
- Directory structure and configuration reference
- Troubleshooting guide

**Use for:** Understanding WHAT we're building and WHY

### Document 2: Package Design Specification
**File:** `jhc-claude-ecosystem-package.md`
**Contains:**
- CLI command structure and syntax
- Interactive wizard flow (7-step process with ASCII mockups)
- Complete package.json configuration
- Full source file structure with paths
- Implementation code for key files:
  - `src/cli/init.ts` - Main wizard implementation
  - `src/cli/doctor.ts` - Health check command
  - `src/installers/beads.ts` - Beads installation
  - `src/sync/repo-sync.ts` - Private repo sync
- Configuration file formats

**Use for:** HOW to implement each component (copy/adapt provided code)

### Document 3: Product Requirements Document (PRD)
**File:** `jhc-claude-ecosystem-PRD.md`
**Contains:**
- User stories with acceptance criteria
- Functional requirements table
- Technical specifications
- Implementation phases with time estimates
- Testing requirements (unit, integration, E2E)
- Success criteria checklist
- Definition of Done

**Use for:** Validation that implementation meets requirements

---

## 🔨 BUILD INSTRUCTIONS

### Step 1: Initialize Project

```bash
# Create project directory
mkdir claude-ecosystem && cd claude-ecosystem

# Initialize npm package
npm init -y

# Install dependencies (from package.json in Document 2)
npm install @clack/prompts chalk commander execa fs-extra gradient-string ora simple-git which yaml

# Install dev dependencies
npm install -D @types/node typescript vitest tsx @types/fs-extra @types/which

# Create tsconfig.json
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 2: Create Directory Structure

Create the following structure (see Document 2 for complete tree):

```
src/
├── index.ts
├── version.ts
├── cli/
│   ├── index.ts
│   ├── init.ts
│   └── doctor.ts
├── installers/
│   ├── prerequisites.ts
│   ├── claude-code.ts
│   ├── github.ts
│   ├── beads.ts
│   ├── task-master.ts
│   └── mcp-servers.ts
├── sync/
│   ├── repo-sync.ts
│   └── backup.ts
├── utils/
│   ├── platform.ts
│   ├── shell.ts
│   ├── logger.ts
│   └── errors.ts
└── types/
    └── index.ts
```

### Step 3: Implement in Order

Follow the implementation phases from the PRD (Document 3, Section 8):

**Phase 1: Core Infrastructure**
1. `src/utils/platform.ts` - OS detection (use code from Document 2)
2. `src/utils/shell.ts` - Shell command execution
3. `src/utils/logger.ts` - Logging utility
4. `src/cli/index.ts` - CLI framework setup with Commander
5. `src/installers/prerequisites.ts` - Check Node, Git, Claude Code

**Phase 2: GitHub & Sync**
1. `src/installers/github.ts` - GitHub auth (OAuth, PAT, generate)
2. `src/sync/backup.ts` - Backup existing ~/.claude/
3. `src/sync/repo-sync.ts` - Clone/sync private repo (use code from Document 2)

**Phase 3: Tool Installation**
1. `src/installers/beads.ts` - Install Beads (use code from Document 2)
2. `src/installers/task-master.ts` - Install Task Master MCP
3. `src/installers/mcp-servers.ts` - Generic MCP installer

**Phase 4: CLI Commands**
1. `src/cli/init.ts` - Full wizard (use code from Document 2)
2. `src/cli/doctor.ts` - Health check (use code from Document 2)

### Step 4: Test Each Phase

After completing each phase, test before proceeding:

```bash
# Build
npm run build

# Test locally
node dist/cli/index.js --help
node dist/cli/index.js init --dry-run
node dist/cli/index.js doctor
```

---

## ✅ TESTING REQUIREMENTS

### Unit Tests (Required)

Create tests in `tests/` directory using Vitest:

```typescript
// tests/utils/platform.test.ts
import { describe, it, expect } from 'vitest';
import { getPlatform } from '../../src/utils/platform';

describe('getPlatform', () => {
  it('returns valid platform object', () => {
    const platform = getPlatform();
    expect(['windows', 'macos', 'linux']).toContain(platform.os);
    expect(platform.claudeDir).toBeTruthy();
  });
});
```

### Integration Tests (Required)

Test installers actually work:

```typescript
// tests/installers/prerequisites.test.ts
import { describe, it, expect } from 'vitest';
import { checkPrerequisites } from '../../src/installers/prerequisites';

describe('checkPrerequisites', () => {
  it('detects Node.js', async () => {
    const result = await checkPrerequisites();
    expect(result.node.installed).toBe(true);
    expect(result.node.version).toMatch(/\d+\.\d+\.\d+/);
  });
});
```

### E2E Tests (Required Before Release)

Test complete flow on:
1. ✅ Fresh Windows 11 (VM or clean machine)
2. ✅ Fresh macOS (VM or clean machine)

```bash
# E2E test command
npx @jhc/claude-ecosystem init

# Verify results
claude --version                    # Claude Code installed
bd version                          # Beads installed
claude mcp list                     # MCP servers configured
ls ~/.claude/agents/ | wc -l        # 26 agents present
claude-ecosystem doctor             # All green
```

---

## 🎯 SUCCESS CRITERIA

Before considering the package complete, verify ALL of these:

### Functional
- [ ] `init` command completes on Windows without errors
- [ ] `init` command completes on macOS without errors
- [ ] Claude Code CLI is installed (or was already present)
- [ ] GitHub authentication works (OAuth or PAT)
- [ ] Private repo syncs successfully
- [ ] 26 agent files present in `~/.claude/agents/`
- [ ] 40+ hook files present in `~/.claude/hooks/`
- [ ] Beads installs and `bd version` works
- [ ] Task Master MCP responds to queries
- [ ] `doctor` command identifies all components
- [ ] `update` command refreshes from repo

### Quality
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Unit test coverage > 80%
- [ ] All tests pass (`npm test`)
- [ ] No hardcoded paths (uses platform detection)
- [ ] Graceful error handling with fix suggestions
- [ ] Clean Ctrl+C cancellation

### User Experience
- [ ] Welcome banner displays correctly
- [ ] Progress spinners show during long operations
- [ ] Clear success/failure messages
- [ ] No manual copy/paste required from user
- [ ] Works with `npx @jhc/claude-ecosystem` (no global install needed)

---

## 🚨 CRITICAL REQUIREMENTS

1. **Always use the provided code patterns** from Document 2. Don't reinvent - adapt.

2. **Test on Windows first** - This is the primary target platform (PowerShell/winget).

3. **Handle authentication securely** - Never log tokens, store in Claude Code's secure config.

4. **Backup before overwriting** - Always backup `~/.claude/` before sync.

5. **Verify after install** - Each installer must verify its tool works after installing.

6. **Fail gracefully** - Every error must include a suggested fix command.

---

## 🔄 DEVELOPMENT LOOP

Follow this loop until all success criteria are met:

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   1. READ reference documents                                │
│         ↓                                                    │
│   2. IMPLEMENT one component                                 │
│         ↓                                                    │
│   3. WRITE tests for that component                          │
│         ↓                                                    │
│   4. RUN tests                                               │
│         ↓                                                    │
│      ┌──┴──┐                                                 │
│      │Pass?│                                                 │
│      └──┬──┘                                                 │
│    Yes  │  No                                                │
│    ↓    └──→ FIX and go to step 4                            │
│         ↓                                                    │
│   5. COMMIT with descriptive message                         │
│         ↓                                                    │
│   6. CHECK success criteria                                  │
│         ↓                                                    │
│      ┌──┴──┐                                                 │
│      │Done?│                                                 │
│      └──┬──┘                                                 │
│    Yes  │  No                                                │
│    ↓    └──→ Go to step 2 (next component)                   │
│         ↓                                                    │
│   7. E2E TEST on Windows and macOS                           │
│         ↓                                                    │
│      ┌──┴──┐                                                 │
│      │Pass?│                                                 │
│      └──┬──┘                                                 │
│    Yes  │  No                                                │
│    ↓    └──→ FIX and go to step 7                            │
│         ↓                                                    │
│   8. PUBLISH to npm                                          │
│         ↓                                                    │
│      DONE! ✅                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTATION CHECKLIST

Use this checklist to track progress:

### Phase 1: Core Infrastructure
- [ ] Created project with package.json
- [ ] Created tsconfig.json
- [ ] Created directory structure
- [ ] Implemented `src/utils/platform.ts`
- [ ] Implemented `src/utils/shell.ts`
- [ ] Implemented `src/utils/logger.ts`
- [ ] Implemented `src/utils/errors.ts`
- [ ] Implemented `src/cli/index.ts` (Commander setup)
- [ ] Implemented `src/installers/prerequisites.ts`
- [ ] Created `bin/claude-ecosystem.js` entry point
- [ ] Tested: `npm run build` succeeds
- [ ] Tested: `--help` works

### Phase 2: GitHub & Sync
- [ ] Implemented `src/installers/github.ts`
- [ ] Implemented `src/sync/backup.ts`
- [ ] Implemented `src/sync/repo-sync.ts`
- [ ] Tested: GitHub PAT validation works
- [ ] Tested: Backup creates timestamped copy
- [ ] Tested: Private repo clones (with valid token)

### Phase 3: Tool Installation
- [ ] Implemented `src/installers/claude-code.ts`
- [ ] Implemented `src/installers/beads.ts`
- [ ] Implemented `src/installers/task-master.ts`
- [ ] Implemented `src/installers/mcp-servers.ts`
- [ ] Tested: Claude Code installs on Windows
- [ ] Tested: Beads installs via winget
- [ ] Tested: Task Master MCP installs

### Phase 4: CLI Commands
- [ ] Implemented `src/cli/init.ts` (full wizard)
- [ ] Implemented `src/cli/doctor.ts`
- [ ] Implemented `src/cli/update.ts`
- [ ] Tested: Full init wizard completes
- [ ] Tested: Doctor identifies all components
- [ ] Tested: Update syncs latest

### Phase 5: Testing & Polish
- [ ] Created unit tests (>80% coverage)
- [ ] Created integration tests
- [ ] E2E tested on Windows
- [ ] E2E tested on macOS
- [ ] All success criteria verified
- [ ] README.md written
- [ ] Published to npm

---

## 🆘 IF YOU GET STUCK

1. **Re-read the reference documents** - The answer is likely there
2. **Check Document 2 for code** - Most implementations are provided
3. **Check PRD Section 9** - Testing requirements are detailed
4. **Simplify** - Get basic version working before adding features
5. **Ask for clarification** - Reference specific document/section

---

## 📦 FINAL DELIVERABLE

When complete, the user should be able to run:

```bash
npx @jhc/claude-ecosystem init
```

And in under 10 minutes have:
- ✅ Claude Code CLI installed
- ✅ GitHub authenticated and MCP configured
- ✅ 26 specialized agents in `~/.claude/agents/`
- ✅ 40+ automation hooks in `~/.claude/hooks/`
- ✅ Beads installed and working
- ✅ Task Master AI configured
- ✅ Selected MCP servers installed
- ✅ Ready to run `claude` and use the full ecosystem

---

**START BUILDING NOW. Read the documents. Follow the phases. Test continuously. Ship it.**
