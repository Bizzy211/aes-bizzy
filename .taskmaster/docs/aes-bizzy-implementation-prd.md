# A.E.S - Bizzy Implementation PRD

## Project Overview

**Project Name:** A.E.S - Bizzy Ecosystem Implementation
**Version:** 1.0.0
**Created:** 2025-12-22
**Status:** Ready for Implementation

### Vision

Implement the complete A.E.S - Bizzy multi-agent ecosystem with 10 core agents, 1 meta-agent, Beads CLI integration, and component sync mechanism. This transforms the Claude Code experience into a coordinated multi-agent development platform.

### Goals

1. Deploy 10+1 agent architecture to bizzy211/claude-subagents repository
2. Migrate and organize 32 hooks with Beads integration
3. Integrate 9 skills with cross-references
4. Set up 6 commands for common workflows
5. Enhance sync mechanism with manifest-based installation
6. Enable agent assignment via Beads CLI

---

## Phase 1: Repository Structure & Beads Enhancement

**Priority:** Critical
**Timeline:** Week 1

### Requirements

#### 1.1 Beads CLI --assign Flag
Add agent assignment capability to Beads CLI:
- `bd create --assign <agent-name>` to assign tasks during creation
- `bd ready --assigned <agent-name>` to filter tasks by assigned agent
- Store assignedAgent in bead metadata
- Validate agent exists in agent-index.json

#### 1.2 Repository Directory Structure
Create organized structure in bizzy211/claude-subagents:
- `agents/core/` - 10 core agents
- `agents/meta/` - Meta-agent for dynamic generation
- `agents/generated/` - Runtime generated agents
- `hooks/essential/` - 8 must-have hooks
- `hooks/recommended/` - 13 validation hooks
- `hooks/optional/` - 5 context hooks
- `hooks/utils/` - 6 utility modules
- `skills/essential/` - 5 core skills
- `skills/research/` - 2 research skills
- `skills/optional/` - 2 creator skills
- `commands/essential/` - 3 core commands
- `commands/optional/` - 3 utility commands
- `templates/` - Agent, hook, skill templates
- `manifests/` - Component manifests

#### 1.3 Component Manifests
Create installation manifests:
- `manifests/essential.json` - 27 MVP files
- `manifests/recommended.json` - 46 production files
- `manifests/full.json` - 61 complete files

#### 1.4 Agent Registry
Create `agent-index.json` with:
- coreAgents array (10 agents)
- metaAgent object
- generatedAgents array (empty, runtime populated)
- Agent metadata: id, name, path, capabilities, tools

---

## Phase 2: Core Agents

**Priority:** Critical
**Timeline:** Week 1-2
**Dependencies:** Phase 1

### Requirements

#### 2.1 Update Existing Agents
Update with Beads workflow and --assign flag:
- `pm-lead.md` - Master orchestrator
- `frontend-dev.md` - React/Next.js specialist
- `backend-dev.md` - Node.js/Python specialist

#### 2.2 Create New Core Agents
Create 7 new agents following AGENT_TEMPLATE.md:
- `db-architect.md` - Database design, SQL, migrations, Supabase
- `test-engineer.md` - Testing strategies, unit/integration/e2e
- `devops-engineer.md` - CI/CD, Docker, deployment
- `security-expert.md` - Security audits, vulnerability assessment
- `docs-engineer.md` - Technical documentation, API docs
- `code-reviewer.md` - Code quality, best practices
- `debugger.md` - Root cause analysis, bug fixing

#### 2.3 Create Meta-Agent
Create `agent-creator.md` with:
- exa.ai research workflow for best practices
- ref.tools documentation lookup
- Agent generation template
- Validation checklist for generated agents
- Integration with agent-index.json

---

## Phase 3: Essential Hooks

**Priority:** Critical
**Timeline:** Week 2
**Dependencies:** Phase 1

### Requirements

#### 3.1 Core Session Hooks
Migrate with Beads integration:
- `session_start.py` - Add Beads context loading (`bd ready --json`)
- `pre_tool_use.py` - Keep security blocking (rm -rf, .env)
- `post_tool_use.py` - Add optional Beads logging
- `pre_compact.py` - Keep context save behavior
- `stop.py` - **Add `bd sync` call before session end**
- `subagent_stop.py` - Add Beads handoff logging
- `user_prompt_submit.py` - Keep message interception

#### 3.2 Security Hook
- `secret-scanner.py` - Keep credential detection (API keys, tokens, passwords)

---

## Phase 4: Recommended & Optional Hooks

**Priority:** High
**Timeline:** Week 2-3
**Dependencies:** Phase 3

### Requirements

#### 4.1 Validation Hooks (13)
Migrate to `hooks/recommended/`:
- `pre-commit-validator.py` - Add Beads task reference
- `validate-git-commit.py`
- `gitignore-enforcer.py`
- `env-sync-validator.py`
- `api-docs-enforcer.py`
- `api-endpoint-verifier.py`
- `database-extension-check.py`
- `duplicate-detector.py`
- `no-mock-code.py`
- `readme-update-validator.py`
- `style-consistency.py`
- `timestamp-validator.py`
- `mcp-tool-enforcer.py`

#### 4.2 Optional Hooks (5)
Migrate to `hooks/optional/`:
- `add-context.py`
- `context-summary.py`
- `quality-check.py`
- `task-handoff.py` - Rewrite with Beads handoff
- `log-commands.py`

#### 4.3 Utility Modules (6)
Migrate to `hooks/utils/`:
- `utils/llm/anth.py` - Anthropic wrapper
- `utils/llm/oai.py` - OpenAI wrapper
- `utils/llm/ollama.py` - Ollama wrapper
- `utils/tts/elevenlabs_tts.py`
- `utils/tts/openai_tts.py`
- `utils/tts/pyttsx3_tts.py`

---

## Phase 5: Skills Integration

**Priority:** High
**Timeline:** Week 3
**Dependencies:** Phase 1

### Requirements

#### 5.1 Essential Skills (5)
Migrate to `skills/essential/`:
- `beads/SKILL.md` - Update to v1.0.0 syntax with --assign flag
- `task-master/SKILL.md` - Add Beads integration section
- `github-issues/SKILL.md` - Keep GitHub workflow
- `project-init/SKILL.md` - Add Beads initialization
- `agent-creator/SKILL.md` - Update for 10+1 architecture

#### 5.2 Research Skills (2)
Migrate to `skills/research/`:
- `exa-ai/SKILL.md` - Web search and code context
- `ref-tools/SKILL.md` - Documentation lookup

#### 5.3 Optional Skills (2)
Migrate to `skills/optional/`:
- `skill-creator/SKILL.md` - Create new skills
- `hook-creator/SKILL.md` - Create new hooks

---

## Phase 6: Commands

**Priority:** Medium
**Timeline:** Week 3
**Dependencies:** Phase 1

### Requirements

#### 6.1 Essential Commands (3)
Migrate to `commands/essential/`:
- `prime.md` - Load context for new session
- `git_status.md` - Git repository status
- `question.md` - Answer questions without coding

#### 6.2 Optional Commands (3)
Migrate to `commands/optional/`:
- `all_tools.md` - List available tools
- `prime_tts.md` - Prime with TTS announcement
- `update_status_line.md` - Update session status

---

## Phase 7: Templates

**Priority:** Medium
**Timeline:** Week 3
**Dependencies:** Phase 2

### Requirements

#### 7.1 Template Files
Create/update in `templates/`:
- `CLAUDE.md` - Global Claude Code instructions template
- `project-claude.md` - Per-project template with placeholders
- `AGENT_TEMPLATE.md` - Complete agent creation template with Beads workflow

---

## Phase 8: Sync Mechanism Updates

**Priority:** High
**Timeline:** Week 4
**Dependencies:** Phase 1, Phase 3

### Requirements

#### 8.1 Update repo-sync.ts
Enhance existing sync with:
- Manifest loading (`essential.json`, `recommended.json`, `full.json`)
- Category filtering (essential/recommended/optional)
- Agent registry management
- Project-level sync support

#### 8.2 CLI Enhancements
Add new flags to sync command:
- `--manifest <name>` - Select installation manifest
- `--project <path>` - Sync to project directory
- `--check` - Check for updates without syncing
- `--restore <timestamp>` - Rollback to backup

#### 8.3 Type Updates
Add to `src/types/`:
- Manifest types for component listings
- Agent registry types
- Project manifest types for local overrides

---

## Phase 9: Testing & Validation

**Priority:** High
**Timeline:** Week 4
**Dependencies:** All previous phases

### Requirements

#### 9.1 Unit Tests
Create tests for:
- Sync manifest loading
- Category filtering logic
- Conflict resolution
- Backup/restore functionality

#### 9.2 Integration Tests
Test complete workflows:
- Full sync workflow (fresh install)
- Project-level sync
- Agent discovery and registration
- Hook loading in Claude Code

#### 9.3 End-to-End Tests
Validate scenarios:
- Fresh installation on new machine
- Update from previous version
- Rollback after failed update
- Project-specific component sync

---

## Phase 10: Documentation

**Priority:** Medium
**Timeline:** Week 4
**Dependencies:** All previous phases

### Requirements

#### 10.1 User Documentation
Create/update:
- README.md with sync commands and quick start
- Quick-start guide for new users
- Component categories documentation
- Project-level customization guide

#### 10.2 Developer Documentation
Create/update:
- Agent creation guide with examples
- Hook development guide
- Skill creation guide
- Contribution guidelines for the ecosystem

---

## Success Criteria

1. All 10 core agents have Beads workflow with --assign flag support
2. Meta-agent can generate specialized agents using exa.ai + ref.tools
3. All 8 essential hooks load without errors
4. `bd sync` is called automatically on session end
5. Secret scanner blocks credential leaks in commits
6. Sync command supports manifest-based installation
7. Project-level sync works with local manifests
8. All documentation is complete and accurate

---

## File Summary

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

*A.E.S - Bizzy Implementation PRD*
*Generated: 2025-12-22*
