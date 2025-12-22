# A.E.S - Bizzy Sync Mechanism Design

> Generated: 2025-12-22 | Task: 41.5

---

## Overview

The sync mechanism distributes ecosystem components (hooks, skills, commands, agents) from the central repository to user environments. Building on the existing `repo-sync.ts`, this design adds:

1. **Component Categories** - Essential, Recommended, Optional
2. **Project-Level Sync** - Per-project component selection
3. **Agent Registry** - Dynamic agent discovery for 10+1 architecture
4. **Beads Integration** - Task tracking for sync operations

---

## Architecture

### Source Repository Structure

```
bizzy211/claude-subagents/
├── agents/
│   ├── core/                    # 10 core agents
│   │   ├── pm-lead.md
│   │   ├── frontend-dev.md
│   │   ├── backend-dev.md
│   │   ├── db-architect.md
│   │   ├── test-engineer.md
│   │   ├── devops-engineer.md
│   │   ├── security-expert.md
│   │   ├── docs-engineer.md
│   │   ├── code-reviewer.md
│   │   └── debugger.md
│   ├── meta/                    # Meta-agent
│   │   └── agent-creator.md
│   ├── generated/               # On-demand generated agents
│   └── agent-index.json         # Agent registry
├── hooks/
│   ├── essential/               # 8 must-have hooks
│   │   ├── session_start.py
│   │   ├── pre_tool_use.py
│   │   ├── post_tool_use.py
│   │   ├── pre_compact.py
│   │   ├── stop.py
│   │   ├── subagent_stop.py
│   │   ├── user_prompt_submit.py
│   │   └── secret-scanner.py
│   ├── recommended/             # 15 validation hooks
│   └── optional/                # Context hooks
├── skills/
│   ├── essential/               # Core skills
│   │   ├── beads/
│   │   ├── task-master/
│   │   ├── github-issues/
│   │   ├── project-init/
│   │   └── agent-creator/
│   ├── research/                # Research tools
│   │   ├── exa-ai/
│   │   └── ref-tools/
│   └── optional/                # Creator skills
├── commands/
│   ├── essential/               # Core commands
│   │   ├── prime.md
│   │   ├── git_status.md
│   │   └── question.md
│   └── optional/
├── templates/
│   ├── CLAUDE.md
│   ├── AGENT_TEMPLATE.md
│   └── PROJECT_TEMPLATE.md
└── manifests/
    ├── essential.json           # MVP components
    ├── recommended.json         # Enhanced components
    └── full.json               # Complete installation
```

### Target Environment Structure

```
~/.claude/                       # Global installation
├── agents/
│   ├── core/
│   ├── meta/
│   └── generated/
├── hooks/
├── skills/
├── commands/
├── ecosystem.json               # Sync state
└── agent-index.json             # Agent registry

<project>/                       # Project-level
├── .claude/
│   ├── hooks/                   # Project-specific hooks
│   ├── skills/                  # Project-specific skills
│   ├── commands/                # Project-specific commands
│   └── settings.json
├── .beads/                      # Beads task database
├── .taskmaster/                 # Task Master files
└── CLAUDE.md                    # Project instructions
```

---

## Component Manifests

### essential.json (MVP)
```json
{
  "version": "1.0.0",
  "name": "essential",
  "description": "Minimum required components for A.E.S - Bizzy",
  "components": {
    "agents": {
      "core": ["pm-lead", "frontend-dev", "backend-dev", "db-architect", "test-engineer", "devops-engineer", "security-expert", "docs-engineer", "code-reviewer", "debugger"],
      "meta": ["agent-creator"]
    },
    "hooks": {
      "essential": ["session_start", "pre_tool_use", "post_tool_use", "pre_compact", "stop", "subagent_stop", "user_prompt_submit", "secret-scanner"]
    },
    "skills": {
      "essential": ["beads", "task-master", "github-issues", "project-init", "agent-creator"]
    },
    "commands": {
      "essential": ["prime", "git_status", "question"]
    }
  },
  "totalFiles": 27
}
```

### recommended.json (Enhanced)
```json
{
  "version": "1.0.0",
  "name": "recommended",
  "extends": "essential",
  "description": "Enhanced components for production use",
  "components": {
    "hooks": {
      "recommended": [
        "pre-commit-validator",
        "validate-git-commit",
        "gitignore-enforcer",
        "env-sync-validator",
        "api-docs-enforcer",
        "api-endpoint-verifier",
        "database-extension-check",
        "duplicate-detector",
        "no-mock-code",
        "readme-update-validator",
        "style-consistency",
        "timestamp-validator",
        "mcp-tool-enforcer"
      ]
    },
    "skills": {
      "research": ["exa-ai", "ref-tools"]
    },
    "commands": {
      "optional": ["all_tools", "prime_tts", "update_status_line"]
    }
  },
  "totalFiles": 46
}
```

---

## Sync Commands

### CLI Interface

```bash
# Initialize global installation
bizzy sync --init

# Sync essential components only
bizzy sync --manifest essential

# Sync recommended components
bizzy sync --manifest recommended

# Sync all components
bizzy sync --manifest full

# Sync specific component types
bizzy sync --agents --hooks

# Sync to project (local override)
bizzy sync --project

# Check for updates
bizzy sync --check

# Dry run
bizzy sync --dry-run

# Force overwrite
bizzy sync --force
```

### TypeScript Interface

```typescript
interface SyncOptions {
  // Target selection
  global?: boolean;          // Sync to ~/.claude
  project?: string;          // Sync to project directory

  // Manifest selection
  manifest?: 'essential' | 'recommended' | 'full' | 'custom';
  customManifest?: string;   // Path to custom manifest

  // Component selection
  components?: ComponentType[];
  categories?: ('essential' | 'recommended' | 'optional')[];

  // Behavior
  force?: boolean;
  dryRun?: boolean;
  interactive?: boolean;

  // Conflict handling
  conflictStrategy?: 'backup' | 'overwrite' | 'skip' | 'merge';

  // Authentication
  token?: string;            // GitHub token
}

interface SyncManifest {
  version: string;
  name: string;
  extends?: string;          // Parent manifest
  description: string;
  components: {
    agents?: Record<string, string[]>;
    hooks?: Record<string, string[]>;
    skills?: Record<string, string[]>;
    commands?: Record<string, string[]>;
  };
  totalFiles: number;
}
```

---

## Sync Flow

### Phase 1: Initialization

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYNC INIT                                │
├─────────────────────────────────────────────────────────────────┤
│  1. Authenticate with GitHub                                    │
│     └─ Token from: ENV, keychain, or prompt                    │
│                                                                  │
│  2. Clone/Update Repository                                     │
│     └─ Shallow clone to temp directory                         │
│                                                                  │
│  3. Load Manifest                                               │
│     └─ Parse selected manifest (essential/recommended/full)    │
│                                                                  │
│  4. Discover Components                                         │
│     └─ Scan repo directories, build file list                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Selection & Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                      SELECTION & VALIDATION                      │
├─────────────────────────────────────────────────────────────────┤
│  5. Filter Components                                           │
│     └─ Match manifest requirements with discovered files        │
│                                                                  │
│  6. Check Conflicts                                             │
│     └─ Identify existing files that would be overwritten       │
│                                                                  │
│  7. Present Summary (if interactive)                            │
│     └─ Show: to install, to update, conflicts                  │
│                                                                  │
│  8. Get User Confirmation                                       │
│     └─ Proceed? / Select specific components?                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Sync Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                       SYNC EXECUTION                             │
├─────────────────────────────────────────────────────────────────┤
│  9. Create Backup                                               │
│     └─ Backup existing files to ~/.claude/backups/             │
│                                                                  │
│ 10. Copy Components                                             │
│     └─ agents/ → ~/.claude/agents/                             │
│     └─ hooks/  → ~/.claude/hooks/                              │
│     └─ skills/ → ~/.claude/skills/                             │
│     └─ commands/ → ~/.claude/commands/                         │
│                                                                  │
│ 11. Update Agent Registry                                       │
│     └─ Merge new agents into agent-index.json                  │
│                                                                  │
│ 12. Update Ecosystem Config                                     │
│     └─ Record sync state in ecosystem.json                     │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Verification

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERIFICATION                              │
├─────────────────────────────────────────────────────────────────┤
│ 13. Validate Installation                                       │
│     └─ Check all expected files exist                          │
│     └─ Verify file integrity (checksums)                       │
│                                                                  │
│ 14. Test Hook Loading                                           │
│     └─ Ensure hooks are syntactically valid Python             │
│                                                                  │
│ 15. Report Summary                                              │
│     └─ Components synced, updated, skipped                     │
│     └─ Any errors or warnings                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Registry Management

### agent-index.json Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-22T14:00:00Z",
  "coreAgents": [
    {
      "name": "pm-lead",
      "file": "core/pm-lead.md",
      "static": true,
      "version": "1.0.0",
      "tools": ["Task", "Bash", "Read", "Write", "..."],
      "description": "Master project orchestrator"
    }
  ],
  "metaAgent": {
    "name": "agent-creator",
    "file": "meta/agent-creator.md",
    "capabilities": ["exa.ai", "ref.tools", "dynamic-generation"]
  },
  "generatedAgents": [
    {
      "name": "splunk-xml-dev",
      "file": "generated/splunk-xml-dev.md",
      "generatedAt": "2025-12-22T15:30:00Z",
      "generatedBy": "agent-creator",
      "researchSources": ["exa.ai", "ref.tools"]
    }
  ]
}
```

### Agent Discovery Flow

```typescript
async function discoverAgents(): Promise<AgentRegistry> {
  // 1. Load agent-index.json
  const registry = await loadAgentRegistry();

  // 2. Scan core agents
  const coreAgents = await scanDirectory('~/.claude/agents/core');

  // 3. Scan meta agent
  const metaAgent = await scanDirectory('~/.claude/agents/meta');

  // 4. Scan generated agents
  const generatedAgents = await scanDirectory('~/.claude/agents/generated');

  // 5. Merge and validate
  return {
    coreAgents: validateAgents(coreAgents),
    metaAgent: validateAgents(metaAgent),
    generatedAgents: validateAgents(generatedAgents)
  };
}
```

---

## Project-Level Sync

### Use Case

Projects may need different component configurations:

```bash
# Web app project - needs frontend + backend agents
bizzy sync --project ./my-web-app --agents frontend-dev,backend-dev,test-engineer

# Splunk project - needs splunk agent (generated on-demand)
bizzy sync --project ./splunk-dashboards --agents splunk-xml-dev

# API project - minimal hooks
bizzy sync --project ./api-service --hooks essential
```

### Project Manifest (.claude/sync-manifest.json)

```json
{
  "project": "my-web-app",
  "extends": "essential",
  "components": {
    "agents": {
      "include": ["frontend-dev", "backend-dev", "test-engineer"],
      "exclude": ["devops-engineer", "security-expert"]
    },
    "hooks": {
      "include": ["essential", "pre-commit-validator"],
      "exclude": []
    },
    "skills": {
      "include": ["all"]
    }
  },
  "syncedAt": "2025-12-22T14:00:00Z",
  "syncedFrom": "github.com/bizzy211/claude-subagents@abc123"
}
```

---

## Beads Integration

### Sync Tasks in Beads

```bash
# Before sync
bd create "Sync: Update ecosystem components" \
  --description="Pull latest from claude-subagents repo" \
  -p 2 --json

# After successful sync
bd close ${SYNC_TASK_ID} --reason "Synced 27 components from abc123" --json

# Sync to Git
bd sync
```

### Automatic Beads Notes

The sync mechanism automatically logs to Beads:

```bash
# On sync start
bd update ${ID} --add-note "Starting sync: manifest=essential" --json

# On conflict
bd update ${ID} --add-note "Conflict: pre_tool_use.py (backed up)" --json

# On completion
bd update ${ID} --add-note "Completed: 25 synced, 2 skipped" --json
```

---

## Update Notifications

### Check for Updates

```typescript
async function checkForUpdates(): Promise<UpdateInfo> {
  const config = await loadEcosystemConfig();
  const { currentSha } = await pullLatestChanges(token);

  if (config.sync?.commitSha !== currentSha) {
    return {
      hasUpdates: true,
      previousSha: config.sync?.commitSha,
      currentSha,
      changedComponents: await getChangedComponents()
    };
  }

  return { hasUpdates: false };
}
```

### Session Start Hook Integration

```python
# In session_start.py
async def check_ecosystem_updates():
    """Check for ecosystem updates at session start"""
    result = subprocess.run(
        ['bizzy', 'sync', '--check', '--json'],
        capture_output=True, text=True
    )

    info = json.loads(result.stdout)
    if info.get('hasUpdates'):
        print(f"⚠️ Ecosystem updates available: {info['changedCount']} components")
        print(f"   Run 'bizzy sync' to update")
```

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| AUTH_FAILED | Invalid/expired token | Re-authenticate with `bizzy auth` |
| NETWORK_ERROR | Connection issues | Retry with `--retry 3` |
| CONFLICT | File already exists | Use `--force` or `--strategy backup` |
| PERMISSION | Write access denied | Check file permissions |
| VALIDATION | Corrupt component file | Report issue, skip file |

### Rollback Mechanism

```bash
# List available backups
bizzy sync --list-backups

# Restore from backup
bizzy sync --restore 2025-12-22-140000

# Restore specific component
bizzy sync --restore 2025-12-22-140000 --component hooks/pre_tool_use.py
```

---

## Implementation Checklist

### Phase 1: Core Sync
- [ ] Add manifest loading to repo-sync.ts
- [ ] Implement category filtering (essential/recommended/optional)
- [ ] Add agent registry management
- [ ] Update component directory structure

### Phase 2: CLI Integration
- [ ] Add `--manifest` flag to sync command
- [ ] Add `--project` flag for project-level sync
- [ ] Add `--check` flag for update checking
- [ ] Add `--restore` flag for rollback

### Phase 3: Beads Integration
- [ ] Auto-create sync task in Beads
- [ ] Log sync progress to task notes
- [ ] Close task with summary on completion

### Phase 4: Verification
- [ ] Add file integrity checks
- [ ] Add hook syntax validation
- [ ] Add agent schema validation

---

*Sync Mechanism Design - A.E.S - Bizzy*
*Task 41.5 | December 2025*
