# A.E.S - Bizzy Hooks Migration Plan

> Generated: 2025-12-22 | Task: 41.6

---

## Overview

This plan outlines the migration of hooks from `Claude Files/hooks/` to the structured A.E.S - Bizzy ecosystem with proper categorization and Beads integration.

---

## Source Analysis

### Current Location
```
S:\Projects\JHC-Claude-System\Claude Files\hooks\
├── session_start.py           # 180 lines
├── pre_tool_use.py            # 156 lines
├── post_tool_use.py           # 89 lines
├── pre_compact.py             # 45 lines
├── stop.py                    # 67 lines
├── subagent_stop.py           # 52 lines
├── user_prompt_submit.py      # 73 lines
├── secret-scanner.py          # 234 lines
├── pre-commit-validator.py    # 145 lines
├── validate-git-commit.py     # 112 lines
├── ... (53 total files)
└── agents/                    # SKIP - use agent definitions instead
```

### Target Location
```
bizzy211/claude-subagents/hooks/
├── essential/                  # Always installed (8 hooks)
│   ├── session_start.py
│   ├── pre_tool_use.py
│   ├── post_tool_use.py
│   ├── pre_compact.py
│   ├── stop.py
│   ├── subagent_stop.py
│   ├── user_prompt_submit.py
│   └── secret-scanner.py
├── recommended/                # Production-ready (13 hooks)
│   ├── pre-commit-validator.py
│   ├── validate-git-commit.py
│   ├── gitignore-enforcer.py
│   └── ...
├── optional/                   # On-demand (7 hooks)
│   ├── add-context.py
│   ├── context-summary.py
│   └── ...
└── utils/                      # Shared utilities
    ├── llm/
    │   ├── anth.py
    │   ├── oai.py
    │   └── ollama.py
    └── tts/
        ├── elevenlabs_tts.py
        ├── openai_tts.py
        └── pyttsx3_tts.py
```

---

## Migration Tasks

### Phase 1: Essential Hooks (8)

| Hook | Modifications Required | Priority |
|------|------------------------|----------|
| `session_start.py` | Add Beads context loading | High |
| `pre_tool_use.py` | Keep as-is (security critical) | High |
| `post_tool_use.py` | Add Beads logging option | Medium |
| `pre_compact.py` | Keep as-is | Medium |
| `stop.py` | **Add `bd sync` call** | High |
| `subagent_stop.py` | Add Beads handoff logging | Medium |
| `user_prompt_submit.py` | Keep as-is | Medium |
| `secret-scanner.py` | Keep as-is (security critical) | High |

#### Modifications for `stop.py`

```python
# BEFORE
async def on_stop(event):
    """Session end handler"""
    logger.info("Session ended")

# AFTER
async def on_stop(event):
    """Session end handler with Beads sync"""
    import subprocess

    # Sync Beads before ending
    try:
        result = subprocess.run(
            ['bd', 'sync'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            logger.info("Beads synced successfully")
        else:
            logger.warning(f"Beads sync warning: {result.stderr}")
    except subprocess.TimeoutExpired:
        logger.warning("Beads sync timed out")
    except FileNotFoundError:
        logger.debug("Beads CLI not installed")

    logger.info("Session ended")
```

#### Modifications for `session_start.py`

```python
# Add to existing session_start.py
async def load_beads_context():
    """Load ready tasks from Beads"""
    import subprocess
    import json

    try:
        result = subprocess.run(
            ['bd', 'ready', '--json'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            tasks = json.loads(result.stdout)
            if tasks:
                print(f"\n📋 Beads: {len(tasks)} ready tasks")
                for task in tasks[:3]:  # Show top 3
                    print(f"   • [{task['id']}] {task['title']}")
    except Exception:
        pass  # Beads is optional
```

---

### Phase 2: Recommended Hooks (13)

| Hook | Category | Modifications |
|------|----------|---------------|
| `pre-commit-validator.py` | validation | Add Beads task reference in commit |
| `validate-git-commit.py` | validation | Keep as-is |
| `gitignore-enforcer.py` | validation | Keep as-is |
| `env-sync-validator.py` | validation | Keep as-is |
| `api-docs-enforcer.py` | validation | Keep as-is |
| `api-endpoint-verifier.py` | validation | Keep as-is |
| `database-extension-check.py` | validation | Keep as-is |
| `duplicate-detector.py` | validation | Keep as-is |
| `no-mock-code.py` | validation | Keep as-is |
| `readme-update-validator.py` | validation | Keep as-is |
| `style-consistency.py` | validation | Keep as-is |
| `timestamp-validator.py` | validation | Keep as-is |
| `mcp-tool-enforcer.py` | validation | Keep as-is |

#### pre-commit-validator.py Enhancement

```python
# Add Beads task reference to commits
def add_beads_reference(commit_message: str) -> str:
    """Add active Beads task to commit message"""
    import subprocess
    import json

    try:
        result = subprocess.run(
            ['bd', 'list', '--status', 'in_progress', '--json'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            tasks = json.loads(result.stdout)
            if tasks and len(tasks) == 1:
                task = tasks[0]
                # Add reference if not already present
                if f"[{task['id']}]" not in commit_message:
                    return f"{commit_message}\n\nBeads: {task['id']}"
    except Exception:
        pass

    return commit_message
```

---

### Phase 3: Optional Hooks (7)

| Hook | Purpose | Modifications |
|------|---------|---------------|
| `add-context.py` | Add context to session | Update for Beads |
| `context-summary.py` | Summarize context | Keep as-is |
| `quality-check.py` | Quality gate checks | Keep as-is |
| `task-handoff.py` | Agent handoff logging | **Replace with Beads handoff** |
| `team-activation.py` | Team activation | Remove (use pm-lead instead) |
| `team-activation-hook.py` | Team activation hook | Remove (duplicate) |
| `log-commands.py` | Command logging | Keep as-is |

#### Replace task-handoff.py with Beads

```python
# NEW: task-handoff.py using Beads
async def log_agent_handoff(from_agent: str, to_agent: str, task_summary: str):
    """Log agent handoff in Beads"""
    import subprocess

    # Create handoff task
    cmd = [
        'bd', 'create',
        f'HANDOFF from {from_agent} to {to_agent}: {task_summary}',
        '--type', 'handoff',
        '-p', '1',
        '--json'
    ]

    subprocess.run(cmd, capture_output=True)
```

---

### Phase 4: Utilities (6)

| Utility | Location | Purpose |
|---------|----------|---------|
| `utils/llm/anth.py` | hooks/utils/llm/ | Anthropic API wrapper |
| `utils/llm/oai.py` | hooks/utils/llm/ | OpenAI API wrapper |
| `utils/llm/ollama.py` | hooks/utils/llm/ | Ollama API wrapper |
| `utils/tts/elevenlabs_tts.py` | hooks/utils/tts/ | ElevenLabs TTS |
| `utils/tts/openai_tts.py` | hooks/utils/tts/ | OpenAI TTS |
| `utils/tts/pyttsx3_tts.py` | hooks/utils/tts/ | Local TTS |

**No modifications needed** - these are utility libraries.

---

## Hooks to SKIP (18)

| Hook | Reason |
|------|--------|
| `agents/project-manager.py` | Use pm-lead agent definition |
| `agents/frontend-developer.py` | Use frontend-dev agent definition |
| `agents/backend-developer.py` | Use backend-dev agent definition |
| `agents/tester.py` | Use test-engineer agent definition |
| `agents/ui-developer.py` | Use frontend-dev agent definition |
| `agents/debugger.py` | Use debugger agent definition |
| `agents/devops-engineer.py` | Use devops-engineer agent definition |
| `agents/security-engineer.py` | Use security-expert agent definition |
| `agents/performance-engineer.py` | Generate via agent-creator |
| `agents/data-engineer.py` | Generate via agent-creator |
| `agents/researcher.py` | Generate via agent-creator |
| `context-forge/*.py` (3 files) | Experimental, not needed for MVP |
| `sync-docs-to-dart.py` | Dart-specific |
| `validate-dart-task.py` | Dart-specific |
| `notification.py` | Optional, low priority |
| `session-end-summary.py` | Merge into stop.py |

---

## Hook Event Mapping

| Event | Hook File | Trigger |
|-------|-----------|---------|
| SessionStart | session_start.py | Claude Code session starts |
| PreToolUse | pre_tool_use.py | Before any tool execution |
| PostToolUse | post_tool_use.py | After any tool execution |
| PreCompact | pre_compact.py | Before context compaction |
| Stop | stop.py | Session ends |
| SubagentStop | subagent_stop.py | Subagent completes |
| UserPromptSubmit | user_prompt_submit.py | User sends message |

---

## Installation Script

```bash
#!/bin/bash
# install-hooks.sh

HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"

# Essential hooks
for hook in session_start pre_tool_use post_tool_use pre_compact stop subagent_stop user_prompt_submit secret-scanner; do
    cp "essential/${hook}.py" "$HOOKS_DIR/"
done

# Recommended hooks (if selected)
if [ "$INSTALL_RECOMMENDED" = "true" ]; then
    for hook in hooks/recommended/*.py; do
        cp "$hook" "$HOOKS_DIR/"
    done
fi

# Utilities
mkdir -p "$HOOKS_DIR/utils/llm" "$HOOKS_DIR/utils/tts"
cp utils/llm/*.py "$HOOKS_DIR/utils/llm/"
cp utils/tts/*.py "$HOOKS_DIR/utils/tts/"

echo "✅ Hooks installed to $HOOKS_DIR"
```

---

## Validation Checklist

### Per-Hook Validation
- [ ] Python syntax valid (`python -m py_compile hook.py`)
- [ ] Required imports available
- [ ] Hook function signature matches event type
- [ ] No hardcoded paths (use `~/.claude/` or env vars)
- [ ] Error handling for optional dependencies (Beads, TTS)

### Integration Validation
- [ ] session_start.py loads without errors
- [ ] pre_tool_use.py blocks dangerous commands
- [ ] secret-scanner.py detects test secrets
- [ ] stop.py calls `bd sync` successfully
- [ ] All hooks register with Claude Code

---

## Migration Timeline

| Week | Tasks |
|------|-------|
| 1 | Migrate essential hooks (8) with Beads integration |
| 2 | Migrate recommended hooks (13) |
| 2 | Migrate utilities (6) |
| 3 | Test all hooks in isolation |
| 3 | Test hooks with Claude Code integration |
| 4 | Documentation and cleanup |

---

## File Manifest

### Essential (8 files)
```
hooks/essential/session_start.py
hooks/essential/pre_tool_use.py
hooks/essential/post_tool_use.py
hooks/essential/pre_compact.py
hooks/essential/stop.py
hooks/essential/subagent_stop.py
hooks/essential/user_prompt_submit.py
hooks/essential/secret-scanner.py
```

### Recommended (13 files)
```
hooks/recommended/pre-commit-validator.py
hooks/recommended/validate-git-commit.py
hooks/recommended/gitignore-enforcer.py
hooks/recommended/env-sync-validator.py
hooks/recommended/api-docs-enforcer.py
hooks/recommended/api-endpoint-verifier.py
hooks/recommended/database-extension-check.py
hooks/recommended/duplicate-detector.py
hooks/recommended/no-mock-code.py
hooks/recommended/readme-update-validator.py
hooks/recommended/style-consistency.py
hooks/recommended/timestamp-validator.py
hooks/recommended/mcp-tool-enforcer.py
```

### Optional (5 files - after cleanup)
```
hooks/optional/add-context.py
hooks/optional/context-summary.py
hooks/optional/quality-check.py
hooks/optional/task-handoff.py
hooks/optional/log-commands.py
```

### Utilities (6 files)
```
hooks/utils/llm/anth.py
hooks/utils/llm/oai.py
hooks/utils/llm/ollama.py
hooks/utils/tts/elevenlabs_tts.py
hooks/utils/tts/openai_tts.py
hooks/utils/tts/pyttsx3_tts.py
```

**Total: 32 files** (down from 53 - 40% reduction)

---

*Hooks Migration Plan - A.E.S - Bizzy*
*Task 41.6 | December 2025*
