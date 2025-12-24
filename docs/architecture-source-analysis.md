# JHC-Claude-System Architecture Source Analysis

**Version**: 2.0
**Date**: 2024-12-24
**Status**: CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

This analysis identified **critical misconfigurations** in file path resolution and **significant duplication** across three agent storage locations. The sync system cannot find agent files at runtime due to incorrect path expectations.

---

## 1. Source Repository Configuration

### Verified Repositories

| Repository | URL | Purpose | NPM Published |
|------------|-----|---------|---------------|
| **aes-bizzy** (Main) | `github.com/bizzy211/aes-bizzy.git` | CLI + Core Logic | Yes |
| **claude-subagents** | `github.com/bizzy211/claude-subagents.git` | Agent Library | No |

### NPM Package Contents

Only these directories are published to npm:
- `dist/` - Compiled TypeScript
- `bin/` - CLI entry point
- `templates/` - 18 template files

**NOT published**: `src/`, `.development/`, `docs/`, `tests/`

---

## 2. Critical Path Resolution Issues

### Bug #1: sync.ts Path Mismatch

**Location**: `src/cli/sync.ts:76-86`

```typescript
function getClaudeFilesPath(): string {
  const localPath = path.join(process.cwd(), 'claude-subagents');  // WRONG!
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  const globalPath = path.join(os.homedir(), '.claude', 'claude-subagents');
  return globalPath;
}
```

**Problem**: Code looks for `./claude-subagents` but files exist at `.development/claude-subagents`

**Impact**: Sync command always falls back to global `~/.claude/claude-subagents` (may not exist)

### Bug #2: agent-capabilities.ts Path Mismatch

**Location**: `src/integrations/github-automation/agent-capabilities.ts:229`

```typescript
const agentsPath = path.join(projectRoot, 'Claude Files', 'agents');  // WRONG!
```

**Problem**: Code expects `./Claude Files/agents` but files exist at `.development/Claude Files/agents`

**Impact**: Agent capability detection fails silently

---

## 3. File Ownership Matrix

### Location Comparison

| Location | File Count | Git Tracked | NPM Published | Actually Used |
|----------|------------|-------------|---------------|---------------|
| `templates/` | 18 | Yes | **Yes** | **Yes** |
| `src/` | 92 | Yes | No (dist is) | Build source |
| `dist/` | 368 | Modified | **Yes** | Runtime |
| `.development/claude-subagents/` | 283 | **No** (gitignored) | No | **Unreachable** |
| `.development/Claude Files/` | 106 | **No** (gitignored) | No | **Unreachable** |

### Total: 389 files in `.development/` that are NOT tracked or reachable by app

---

## 4. Agent Duplication Analysis

### Three Copies of Core Agents

| Agent | templates/ | claude-subagents/ | Claude Files/ |
|-------|------------|-------------------|---------------|
| pm-lead.md | ~3.4KB | 7.6KB | **74.8KB** |
| backend-dev.md | ~2KB | 4.4KB | **42.7KB** |
| frontend-dev.md | ~2KB | 4KB | **74KB** |
| debugger.md | No | 5.6KB | 0.9KB |
| code-reviewer.md | ~2KB | 5.8KB | **55.6KB** |

**Finding**: `Claude Files` versions are 10-20x larger (more comprehensive) but unreachable

### Agents Only in Claude Files (15 additional)

- animated-dashboard-architect.md (38KB)
- beautiful-web-designer.md (175KB!)
- enhanced-splunk-ui-dev.md (90KB)
- integration-expert.md (12KB)
- lint-agent.md (19KB)
- meta-agent.md (19KB)
- n8n-engineer.md (36KB)
- nextjs-sme.md (87KB)
- splunk-ui-dev.md (34KB)
- splunk-xml-dev.md (32KB)
- typescript-validator.md (35KB)
- ue5-SME.md (55KB)
- visual-consistency-guardian.md (26KB)
- work-completion-summary.md (2.4KB)
- mobile-dev.md (1.5KB)

---

## 5. Hook Analysis

### claude-subagents Essential Hooks (8 files)

| Hook | Purpose |
|------|---------|
| session_start.py | Load Beads context |
| stop.py | Sync before exit |
| pre_tool_use.py | Pre-validation |
| post_tool_use.py | Post-processing |
| pre_compact.py | Pre-compact actions |
| subagent_stop.py | Agent termination |
| user_prompt_submit.py | User input handling |
| secret_scanner.py | Security scanning |

### Claude Files Hooks (30+ files)

Additional specialized hooks NOT in claude-subagents:
- context-forge/ (3 hooks)
- agents/ (11 agent-specific hooks)
- Various validators and enforcers

**Issue**: Some hooks exist in BOTH locations with different implementations

---

## 6. Manifest System

### Manifest Files Found

All in `.development/claude-subagents/manifests/`:
- `essential.json` - 30 files (core MVP)
- `recommended.json` - Extended set
- `full.json` - All components
- `agent-index.json` - Agent registry

**Issue**: Manifests reference paths relative to `claude-subagents/` but this directory is unreachable by sync.ts

---

## 7. Orphaned Claude Files Investigation

### Finding

`.development/Claude Files/` has the **same git remote** as the main repo (`aes-bizzy.git`), NOT a separate clone.

**Conclusion**: This is legacy content that was moved to `.development/` at some point, NOT a clone of another repository. It contains the most comprehensive agent implementations but is completely orphaned.

---

## 8. What's Actually Used at Runtime

Based on code path analysis:

| Component | Source | Why |
|-----------|--------|-----|
| CLI Commands | `dist/` (from `src/`) | NPM package entry |
| Templates | `templates/` | NPM published |
| Agents | **None reachable** | Path bugs prevent loading |
| Hooks | **None reachable** | Path bugs prevent loading |
| Skills | **None reachable** | Path bugs prevent loading |

---

## 9. Critical Gaps Identified

### P0 - Breaking Issues

1. **Sync cannot find agents** - Path mismatch in sync.ts
2. **Agent capabilities broken** - Path mismatch in agent-capabilities.ts
3. **389 orphaned files** - Comprehensive content unreachable

### P1 - Significant Issues

4. **Triple duplication** - Same agents in 3 locations, different content
5. **No manifest in templates/** - NPM package has no manifest for sync
6. **Inconsistent hook locations** - Some only in Claude Files

### P2 - Minor Issues

7. **Dead code** - References to paths that don't exist
8. **Missing required files** - Manifests reference files not in templates/

---

## 10. Cleanup Recommendations

### Option A: Fix Path Resolution (Minimal)

1. Update `sync.ts:78` to look in `.development/claude-subagents`
2. Update `agent-capabilities.ts:229` to look in `.development/Claude Files`
3. Keep both directories

**Pros**: Quick fix
**Cons**: Doesn't address duplication, keeps 389 orphaned files

### Option B: Consolidate to One Location (Recommended)

1. Choose ONE authoritative source (recommend `Claude Files` - most complete)
2. Move to `./claude-subagents/` in project root (where sync.ts expects)
3. Update all path references
4. Delete redundant copies
5. Commit consolidated files to git

**Pros**: Clean structure, eliminates duplication
**Cons**: Requires careful migration

### Option C: Proper NPM Package Structure

1. Move essential agents/hooks/skills to `templates/`
2. Update NPM `files` array to include them
3. Remove `.development/` entirely
4. Sync fetches from npm package OR from github clone to `~/.claude/`

**Pros**: Professional package structure
**Cons**: Significant restructure, may lose advanced agents

---

## 11. File Changes Required

### Immediate Fixes

| File | Change Required |
|------|-----------------|
| `src/cli/sync.ts:78` | Change `'claude-subagents'` to `.development/claude-subagents` |
| `src/integrations/github-automation/agent-capabilities.ts:229` | Change `'Claude Files'` to `.development/Claude Files` |

### Structural Fixes

| Action | Files Affected |
|--------|----------------|
| Decide canonical agent source | 3 locations |
| Merge best content | 28+ agent files |
| Update manifests | 4 JSON files |
| Remove duplicates | ~200 files |

---

## 12. Summary Table

| Metric | Current | After Cleanup |
|--------|---------|---------------|
| Agent locations | 3 | 1 |
| Orphaned files | 389 | 0 |
| Path bugs | 2 | 0 |
| Duplicate agents | 10+ | 0 |
| Files reachable by sync | 0 | 30-100+ |

---

**Prepared by**: Architecture Analysis Agent
**Review Required**: Yes - Significant changes needed
