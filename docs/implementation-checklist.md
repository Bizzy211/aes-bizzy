# A.E.S - Bizzy Implementation Checklist

> Generated: 2025-12-22 | Task: 41.8
> Master checklist for implementing the A.E.S - Bizzy ecosystem

---

## Summary

| Component | Files | Status |
|-----------|-------|--------|
| Core Agents | 10 | 🔲 Pending |
| Meta-Agent | 1 | 🔲 Pending |
| Essential Hooks | 8 | 🔲 Pending |
| Recommended Hooks | 13 | 🔲 Pending |
| Optional Hooks | 5 | 🔲 Pending |
| Utility Modules | 6 | 🔲 Pending |
| Essential Skills | 5 | 🔲 Pending |
| Research Skills | 2 | 🔲 Pending |
| Optional Skills | 2 | 🔲 Pending |
| Essential Commands | 3 | 🔲 Pending |
| Optional Commands | 3 | 🔲 Pending |
| Templates | 3 | 🔲 Pending |
| **Total** | **61 files** | |

---

## Phase 1: Repository Structure (Week 1)

### 1.1 Create Directory Structure

```bash
# In bizzy211/claude-subagents repo
mkdir -p agents/{core,meta,generated}
mkdir -p hooks/{essential,recommended,optional,utils/llm,utils/tts}
mkdir -p skills/{essential,research,optional}
mkdir -p commands/{essential,optional}
mkdir -p templates
mkdir -p manifests
```

- [ ] Create `agents/core/` directory
- [ ] Create `agents/meta/` directory
- [ ] Create `agents/generated/` directory (empty, for runtime)
- [ ] Create `hooks/essential/` directory
- [ ] Create `hooks/recommended/` directory
- [ ] Create `hooks/optional/` directory
- [ ] Create `hooks/utils/` directories
- [ ] Create `skills/essential/` directory
- [ ] Create `skills/research/` directory
- [ ] Create `skills/optional/` directory
- [ ] Create `commands/essential/` directory
- [ ] Create `commands/optional/` directory
- [ ] Create `templates/` directory
- [ ] Create `manifests/` directory

### 1.2 Create Manifests

- [ ] Create `manifests/essential.json` (27 files)
- [ ] Create `manifests/recommended.json` (46 files)
- [ ] Create `manifests/full.json` (61 files)
- [ ] Create `agent-index.json` (agent registry)

---

## Phase 2: Core Agents (Week 1-2)

### 2.1 Existing Agents (Update)

| Agent | Source | Target | Status |
|-------|--------|--------|--------|
| pm-lead | `templates/agents/pm-lead.md` | `agents/core/pm-lead.md` | 🔲 |
| frontend-dev | `templates/agents/frontend-dev.md` | `agents/core/frontend-dev.md` | 🔲 |
| backend-dev | `templates/agents/backend-dev.md` | `agents/core/backend-dev.md` | 🔲 |

- [ ] Update `pm-lead.md` with latest Beads workflow
- [ ] Update `frontend-dev.md` with Beads workflow
- [ ] Update `backend-dev.md` with Beads workflow
- [ ] Copy updated files to `agents/core/`

### 2.2 New Agents (Create)

| Agent | Target | Status |
|-------|--------|--------|
| db-architect | `agents/core/db-architect.md` | 🔲 |
| test-engineer | `agents/core/test-engineer.md` | 🔲 |
| devops-engineer | `agents/core/devops-engineer.md` | 🔲 |
| security-expert | `agents/core/security-expert.md` | 🔲 |
| docs-engineer | `agents/core/docs-engineer.md` | 🔲 |
| code-reviewer | `agents/core/code-reviewer.md` | 🔲 |
| debugger | `agents/core/debugger.md` | 🔲 |

- [ ] Create `db-architect.md` from AGENT_TEMPLATE.md
- [ ] Create `test-engineer.md` from AGENT_TEMPLATE.md
- [ ] Create `devops-engineer.md` from AGENT_TEMPLATE.md
- [ ] Create `security-expert.md` from AGENT_TEMPLATE.md
- [ ] Create `docs-engineer.md` from AGENT_TEMPLATE.md
- [ ] Create `code-reviewer.md` from AGENT_TEMPLATE.md
- [ ] Create `debugger.md` from AGENT_TEMPLATE.md

### 2.3 Meta-Agent (Create)

- [ ] Create `agents/meta/agent-creator.md`
- [ ] Include exa.ai research workflow
- [ ] Include ref.tools documentation workflow
- [ ] Include agent generation template
- [ ] Include validation checklist

---

## Phase 3: Essential Hooks (Week 2)

### 3.1 Core Hooks (8)

| Hook | Source | Modifications | Status |
|------|--------|---------------|--------|
| session_start.py | Claude Files/hooks/ | Add Beads context loading | 🔲 |
| pre_tool_use.py | Claude Files/hooks/ | Keep as-is | 🔲 |
| post_tool_use.py | Claude Files/hooks/ | Add Beads logging option | 🔲 |
| pre_compact.py | Claude Files/hooks/ | Keep as-is | 🔲 |
| stop.py | Claude Files/hooks/ | **Add `bd sync`** | 🔲 |
| subagent_stop.py | Claude Files/hooks/ | Add Beads handoff logging | 🔲 |
| user_prompt_submit.py | Claude Files/hooks/ | Keep as-is | 🔲 |
| secret-scanner.py | Claude Files/hooks/ | Keep as-is | 🔲 |

- [ ] Migrate `session_start.py` with Beads integration
- [ ] Migrate `pre_tool_use.py` (no changes)
- [ ] Migrate `post_tool_use.py` with optional logging
- [ ] Migrate `pre_compact.py` (no changes)
- [ ] Migrate `stop.py` with `bd sync` addition
- [ ] Migrate `subagent_stop.py` with handoff logging
- [ ] Migrate `user_prompt_submit.py` (no changes)
- [ ] Migrate `secret-scanner.py` (no changes)

### 3.2 Validation

- [ ] Test each hook loads correctly
- [ ] Test `pre_tool_use.py` blocks `rm -rf`
- [ ] Test `secret-scanner.py` detects API keys
- [ ] Test `stop.py` calls `bd sync`
- [ ] Test `session_start.py` loads Beads context

---

## Phase 4: Recommended & Optional Hooks (Week 2-3)

### 4.1 Recommended Hooks (13)

- [ ] Migrate `pre-commit-validator.py`
- [ ] Migrate `validate-git-commit.py`
- [ ] Migrate `gitignore-enforcer.py`
- [ ] Migrate `env-sync-validator.py`
- [ ] Migrate `api-docs-enforcer.py`
- [ ] Migrate `api-endpoint-verifier.py`
- [ ] Migrate `database-extension-check.py`
- [ ] Migrate `duplicate-detector.py`
- [ ] Migrate `no-mock-code.py`
- [ ] Migrate `readme-update-validator.py`
- [ ] Migrate `style-consistency.py`
- [ ] Migrate `timestamp-validator.py`
- [ ] Migrate `mcp-tool-enforcer.py`

### 4.2 Optional Hooks (5)

- [ ] Migrate `add-context.py`
- [ ] Migrate `context-summary.py`
- [ ] Migrate `quality-check.py`
- [ ] Create new `task-handoff.py` with Beads
- [ ] Migrate `log-commands.py`

### 4.3 Utility Modules (6)

- [ ] Migrate `utils/llm/anth.py`
- [ ] Migrate `utils/llm/oai.py`
- [ ] Migrate `utils/llm/ollama.py`
- [ ] Migrate `utils/tts/elevenlabs_tts.py`
- [ ] Migrate `utils/tts/openai_tts.py`
- [ ] Migrate `utils/tts/pyttsx3_tts.py`

---

## Phase 5: Skills (Week 3)

### 5.1 Essential Skills (5)

| Skill | Source | Target | Status |
|-------|--------|--------|--------|
| beads | Claude Files/skills/ | skills/essential/beads/ | 🔲 |
| task-master | Claude Files/skills/ | skills/essential/task-master/ | 🔲 |
| github-issues | Claude Files/skills/ | skills/essential/github-issues/ | 🔲 |
| project-init | Claude Files/skills/ | skills/essential/project-init/ | 🔲 |
| agent-creator | Claude Files/skills/ | skills/essential/agent-creator/ | 🔲 |

- [ ] Migrate `beads/SKILL.md` with v1.0.0 syntax
- [ ] Migrate `task-master/SKILL.md` with Beads integration
- [ ] Migrate `github-issues/SKILL.md`
- [ ] Migrate `project-init/SKILL.md` with Beads
- [ ] Migrate `agent-creator/SKILL.md` with 10+1 architecture

### 5.2 Research Skills (2)

- [ ] Migrate `exa-ai/SKILL.md`
- [ ] Migrate `ref-tools/SKILL.md`

### 5.3 Optional Skills (2)

- [ ] Migrate `skill-creator/SKILL.md`
- [ ] Migrate `hook-creator/SKILL.md`

---

## Phase 6: Commands (Week 3)

### 6.1 Essential Commands (3)

| Command | Source | Target | Status |
|---------|--------|--------|--------|
| prime.md | Claude Files/commands/ | commands/essential/ | 🔲 |
| git_status.md | Claude Files/commands/ | commands/essential/ | 🔲 |
| question.md | Claude Files/commands/ | commands/essential/ | 🔲 |

- [ ] Migrate `/prime` command
- [ ] Migrate `/git_status` command
- [ ] Migrate `/question` command

### 6.2 Optional Commands (3)

- [ ] Migrate `/all_tools` command
- [ ] Migrate `/prime_tts` command
- [ ] Migrate `/update_status_line` command

---

## Phase 7: Templates (Week 3)

### 7.1 Template Files (3)

- [ ] Create `templates/CLAUDE.md` (global instructions)
- [ ] Create `templates/project-claude.md` (project template)
- [ ] Create `templates/AGENT_TEMPLATE.md` (agent template)

---

## Phase 8: Sync Mechanism Updates (Week 4)

### 8.1 Update repo-sync.ts

- [ ] Add manifest loading
- [ ] Add category filtering (essential/recommended/optional)
- [ ] Add agent registry management
- [ ] Add project-level sync support

### 8.2 Update CLI

- [ ] Add `--manifest` flag
- [ ] Add `--project` flag
- [ ] Add `--check` flag
- [ ] Add `--restore` flag

### 8.3 Update Types

- [ ] Add manifest types to `src/types/repo-sync.ts`
- [ ] Add agent registry types
- [ ] Add project manifest types

---

## Phase 9: Testing & Validation (Week 4)

### 9.1 Unit Tests

- [ ] Test sync manifest loading
- [ ] Test category filtering
- [ ] Test conflict resolution
- [ ] Test backup/restore

### 9.2 Integration Tests

- [ ] Test full sync workflow
- [ ] Test project-level sync
- [ ] Test agent discovery
- [ ] Test hook loading

### 9.3 End-to-End Tests

- [ ] Fresh install scenario
- [ ] Update scenario
- [ ] Rollback scenario
- [ ] Project sync scenario

---

## Phase 10: Documentation (Week 4)

### 10.1 User Documentation

- [ ] Update README.md with sync commands
- [ ] Create quick-start guide
- [ ] Document component categories
- [ ] Document project-level customization

### 10.2 Developer Documentation

- [ ] Document agent creation process
- [ ] Document hook development
- [ ] Document skill creation
- [ ] Document contribution guidelines

---

## Deployment Checklist

### Pre-Deployment

- [ ] All 61 files created and validated
- [ ] All tests passing
- [ ] Manifests accurate
- [ ] Documentation complete

### Deployment

- [ ] Push to `bizzy211/claude-subagents` main branch
- [ ] Tag release v1.0.0
- [ ] Update JHC-Claude-System with sync command
- [ ] Test fresh install

### Post-Deployment

- [ ] Monitor for issues
- [ ] Gather user feedback
- [ ] Plan v1.1.0 improvements

---

## File Count Summary

| Category | Essential | Recommended | Optional | Total |
|----------|-----------|-------------|----------|-------|
| Agents | 10 | - | 1 (meta) | 11 |
| Hooks | 8 | 13 | 5 | 26 |
| Utilities | 6 | - | - | 6 |
| Skills | 5 | 2 | 2 | 9 |
| Commands | 3 | - | 3 | 6 |
| Templates | 3 | - | - | 3 |
| **Total** | **35** | **15** | **11** | **61** |

---

## Timeline Summary

| Week | Phase | Focus |
|------|-------|-------|
| 1 | 1-2 | Repository structure, Core agents |
| 2 | 3-4 | Essential hooks, Recommended hooks |
| 3 | 5-7 | Skills, Commands, Templates |
| 4 | 8-10 | Sync mechanism, Testing, Documentation |

---

## Success Criteria

- [ ] All 10 core agents have Beads workflow
- [ ] Meta-agent can generate specialized agents
- [ ] Essential hooks load without errors
- [ ] `bd sync` called on session end
- [ ] Secret scanner blocks credential leaks
- [ ] Sync command supports manifests
- [ ] Project-level sync works
- [ ] Documentation complete

---

*Implementation Checklist - A.E.S - Bizzy*
*Task 41.8 | December 2025*
