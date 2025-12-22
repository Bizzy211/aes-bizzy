# A.E.S - Bizzy Component Inventory

> Generated: 2025-12-22 | Task: 41.1, 41.2, 41.3

---

## Hooks Inventory (53 files)

### ESSENTIAL - Core Hooks (7)
| Hook | Purpose | Event | Integration |
|------|---------|-------|-------------|
| `session_start.py` | Load git status, context files, GitHub issues | SessionStart | Keep as-is |
| `pre_tool_use.py` | Block dangerous rm -rf, .env access | PreToolUse | Keep as-is |
| `post_tool_use.py` | Log tool executions | PostToolUse | Keep as-is |
| `pre_compact.py` | Pre-compaction context save | PreCompact | Keep as-is |
| `stop.py` | Session end handler | Stop | Add `bd sync` |
| `subagent_stop.py` | Subagent completion handler | SubagentStop | Keep as-is |
| `user_prompt_submit.py` | User message interceptor | UserPromptSubmit | Keep as-is |

### ESSENTIAL - Security Hooks (1)
| Hook | Purpose | Integration |
|------|---------|-------------|
| `secret-scanner.py` | Detect API keys, passwords, tokens in commits | Keep as-is - Critical |

### RECOMMENDED - Session Hooks (2)
| Hook | Purpose | Integration |
|------|---------|-------------|
| `session-end-summary.py` | End session with summary | Add `bd sync` |
| `notification.py` | Desktop notifications | Optional |

### RECOMMENDED - Validation Hooks (13)
| Hook | Purpose | Priority |
|------|---------|----------|
| `pre-commit-validator.py` | Pre-commit checks | High |
| `validate-git-commit.py` | Commit validation | High |
| `gitignore-enforcer.py` | Ensure proper .gitignore | High |
| `env-sync-validator.py` | Env file consistency | Medium |
| `api-docs-enforcer.py` | API documentation required | Medium |
| `api-endpoint-verifier.py` | API endpoint validation | Medium |
| `database-extension-check.py` | DB extension validation | Low |
| `duplicate-detector.py` | Duplicate code detection | Low |
| `no-mock-code.py` | Prevent mock code in prod | Medium |
| `readme-update-validator.py` | README freshness | Low |
| `style-consistency.py` | Code style enforcement | Medium |
| `timestamp-validator.py` | Timestamp validation | Low |
| `mcp-tool-enforcer.py` | MCP tool usage validation | Medium |

### OPTIONAL - Context Hooks (7)
| Hook | Purpose | Priority |
|------|---------|----------|
| `add-context.py` | Add context to session | Low |
| `context-summary.py` | Summarize context | Low |
| `quality-check.py` | Quality gate checks | Medium |
| `task-handoff.py` | Agent handoff logging | Medium - Beads integration |
| `team-activation.py` | Team activation | Low |
| `team-activation-hook.py` | Team activation hook | Low |
| `log-commands.py` | Command logging | Low |

### SKIP - Agent-Specific Hooks (11)
> These are outdated - use Beads workflow in agent definitions instead

| Hook | Reason to Skip |
|------|----------------|
| `agents/project-manager.py` | Use pm-lead agent with Beads |
| `agents/frontend-developer.py` | Use frontend-dev agent with Beads |
| `agents/backend-developer.py` | Use backend-dev agent with Beads |
| `agents/tester.py` | Use test-engineer agent with Beads |
| `agents/ui-developer.py` | Use frontend-dev/ux-designer agents |
| `agents/debugger.py` | Use debugger agent with Beads |
| `agents/devops-engineer.py` | Use devops-engineer agent with Beads |
| `agents/security-engineer.py` | Use security-expert agent with Beads |
| `agents/performance-engineer.py` | Generate on-demand via meta-agent |
| `agents/data-engineer.py` | Generate on-demand via meta-agent |
| `agents/researcher.py` | Generate on-demand via meta-agent |

### SKIP - Context Forge (3)
> Experimental feature - not needed for MVP

### UTILITIES - Keep for TTS/LLM Support (6)
| Utility | Purpose |
|---------|---------|
| `utils/llm/anth.py` | Anthropic API wrapper |
| `utils/llm/oai.py` | OpenAI API wrapper |
| `utils/llm/ollama.py` | Ollama API wrapper |
| `utils/tts/elevenlabs_tts.py` | ElevenLabs TTS |
| `utils/tts/openai_tts.py` | OpenAI TTS |
| `utils/tts/pyttsx3_tts.py` | Local TTS (pyttsx3) |

### SKIP - Dart-Specific (2)
| Hook | Reason |
|------|--------|
| `sync-docs-to-dart.py` | Dart-specific |
| `validate-dart-task.py` | Dart-specific |

---

## Skills Inventory (9 skills)

### ESSENTIAL - Core Skills (5)
| Skill | Purpose | Status |
|-------|---------|--------|
| `beads` | Beads CLI workflow patterns | APPROVED v1.0.0 |
| `task-master` | Task Master AI integration | APPROVED - comprehensive |
| `github-issues` | GitHub integration patterns | Keep |
| `project-init` | Initialize projects with ecosystem | Keep - update for Beads |
| `agent-creator` | Create new specialized agents | CRITICAL for meta-agent |

### RECOMMENDED - Research Skills (2)
| Skill | Purpose | Status |
|-------|---------|--------|
| `exa-ai` | Semantic search, research | Keep - used by meta-agent |
| `ref-tools` | Documentation lookup | Keep - used by meta-agent |

### OPTIONAL - Creator Skills (2)
| Skill | Purpose | Status |
|-------|---------|--------|
| `skill-creator` | Create new skills | Keep for extensibility |
| `hook-creator` | Create automation hooks | Keep for extensibility |

---

## Commands Inventory (7 commands)

### ESSENTIAL - Core Commands (3)
| Command | Purpose | Integration |
|---------|---------|-------------|
| `/prime` | Load context for new session | Keep - update for Beads |
| `/git_status` | Git repository status | Keep as-is |
| `/question` | Answer questions without coding | Keep as-is |

### OPTIONAL - Utility Commands (3)
| Command | Purpose | Integration |
|---------|---------|-------------|
| `/all_tools` | List available tools | Keep - useful for debugging |
| `/prime_tts` | Prime with TTS announcement | Keep if TTS enabled |
| `/update_status_line` | Update session status data | Keep for status tracking |

### SKIP - Demo Commands (1)
| Command | Reason |
|---------|--------|
| `/sentient` | Demo for hook blocking - not useful |

---

## Summary: What to Include in A.E.S - Bizzy

### Hooks (23 of 53)
- **Essential**: 8 hooks (core + security)
- **Recommended**: 15 hooks (session + validation)
- **Skip**: 30 hooks (outdated, dart-specific, experimental)

### Skills (9 of 9)
- **Essential**: 5 skills
- **Recommended**: 2 skills
- **Optional**: 2 skills

### Commands (6 of 7)
- **Essential**: 3 commands
- **Optional**: 3 commands
- **Skip**: 1 command

### Agents (11 total - NEW ARCHITECTURE)
- **Core Agents**: 10 static agents
- **Meta-Agent**: 1 agent-creator for on-demand generation

---

## Integration Priority

### Phase 1: MVP (Must Have)
1. Core hooks (8)
2. Essential skills (5)
3. Essential commands (3)
4. Core agents (10) + meta-agent (1)

### Phase 2: Enhanced (Nice to Have)
1. Recommended validation hooks (13)
2. Research skills (2)
3. Optional commands (3)
4. TTS utilities (3)

### Phase 3: Full (Complete)
1. Creator skills (2)
2. Session hooks (2)
3. Context hooks (7)
4. LLM utilities (3)

---

*Inventory completed as part of Task 41 assessment*
