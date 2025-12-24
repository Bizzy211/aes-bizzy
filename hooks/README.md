# Hooks

Event-driven hooks for Claude Code workflow automation with Beads integration.

## Directory Structure

```
hooks/
├── essential/              # Required hooks for core functionality (8)
│   ├── session_start.py    # Load Beads context at session start
│   ├── stop.py             # CRITICAL: Sync Beads before session end
│   ├── pre_tool_use.py     # Security blocking for dangerous operations
│   ├── post_tool_use.py    # Log tool usage to Beads context
│   ├── pre_compact.py      # Save context before compaction
│   ├── subagent_stop.py    # Log agent handoffs
│   ├── user_prompt_submit.py # Message interception and shortcuts
│   └── secret_scanner.py   # Credential detection
│
├── recommended/            # Enhanced workflow hooks (13)
│   ├── pre_commit_validator.py   # Task reference in commits
│   ├── validate_git_commit.py    # Conventional commit format
│   ├── gitignore_enforcer.py     # Prevent sensitive file commits
│   ├── env_sync_validator.py     # .env/.env.example sync
│   ├── api_docs_enforcer.py      # JSDoc/TSDoc validation
│   ├── api_endpoint_verifier.py  # REST endpoint validation
│   ├── database_extension_check.py # PostgreSQL extension validation
│   ├── duplicate_detector.py     # Code duplication detection
│   ├── no_mock_code.py           # Production code validation
│   ├── readme_update_validator.py # Documentation reminders
│   ├── style_consistency.py      # Code style validation
│   ├── timestamp_validator.py    # Date/time handling
│   └── mcp_tool_enforcer.py      # Tool usage validation
│
├── optional/               # Additional utility hooks (5)
│   ├── add_context.py      # Dynamic context injection
│   ├── context_summary.py  # Session summary generation
│   ├── quality_check.py    # Code quality assessment
│   ├── task_handoff.py     # Beads-based agent handoff
│   └── log_commands.py     # Command history tracking
│
└── utils/                  # Shared hook utilities
    ├── __init__.py         # Common utilities export
    ├── common.py           # Helper functions
    ├── llm/                # LLM integrations
    │   ├── __init__.py
    │   ├── anth.py         # Anthropic (Claude)
    │   ├── oai.py          # OpenAI (GPT)
    │   └── ollama.py       # Ollama (Local)
    └── tts/                # Text-to-Speech integrations
        ├── __init__.py
        ├── elevenlabs_tts.py # ElevenLabs
        ├── openai_tts.py     # OpenAI TTS
        └── pyttsx3_tts.py    # Local/offline
```

## Hook Events

Hooks can respond to Claude Code events:

| Event | Description | Key Hooks |
|-------|-------------|-----------|
| `PreToolUse` | Before tool execution | pre_tool_use.py, secret_scanner.py |
| `PostToolUse` | After tool completion | post_tool_use.py, quality_check.py |
| `Stop` | When Claude stops | stop.py (CRITICAL for Beads sync) |
| `SubAgentStop` | Sub-agent completion | subagent_stop.py |
| `UserPromptSubmit` | User message submitted | user_prompt_submit.py |
| `PreCompact` | Before context compaction | pre_compact.py |

## Beads Integration

All essential hooks integrate with Beads CLI for task tracking:

```python
# Load context at session start
bd ready --json

# Log progress during work
bd update ${TASK_ID} --add-note "Progress..." --json

# CRITICAL: Sync before session end
bd sync
```

## Configuration

Configure hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          "./hooks/essential/pre_tool_use.py",
          "./hooks/essential/secret_scanner.py"
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          "./hooks/recommended/no_mock_code.py",
          "./hooks/recommended/style_consistency.py"
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": ["./hooks/essential/stop.py"]
      }
    ]
  }
}
```

## Hook Categories

### Essential (Always Enabled)

These hooks should always be active:

1. **session_start.py** - Restores Beads context on startup
2. **stop.py** - **CRITICAL** - Syncs Beads before exit
3. **pre_tool_use.py** - Blocks dangerous operations
4. **secret_scanner.py** - Prevents credential exposure

### Recommended (Project-Based)

Enable based on project needs:

- **Git hooks** - pre_commit_validator.py, validate_git_commit.py, gitignore_enforcer.py
- **API hooks** - api_docs_enforcer.py, api_endpoint_verifier.py
- **Code quality** - duplicate_detector.py, no_mock_code.py, style_consistency.py

### Optional (As Needed)

For specific workflows:

- **context_summary.py** - Generate session summaries
- **quality_check.py** - Deep code quality analysis
- **log_commands.py** - Command history for debugging

## Using Utility Modules

### LLM Integration

```python
from hooks.utils.llm import AnthropicClient, OpenAIClient, OllamaClient

# Use Claude for intelligent decisions
client = AnthropicClient()
if client.is_available():
    result = client.analyze_code(code, "Is this code secure?")
```

### TTS Integration

```python
from hooks.utils.tts import ElevenLabsTTS, OpenAITTS, LocalTTS

# Audio feedback
tts = ElevenLabsTTS()
if tts.is_available():
    tts.speak("Task completed successfully")
```

## Creating Custom Hooks

1. Copy an existing hook as template
2. Implement hook logic
3. Add to `.claude/settings.json`
4. Test with sample tool calls

```python
#!/usr/bin/env python3
"""
Custom Hook Template
"""
import json
import sys

def main():
    # Read input from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)  # Pass through on parse error

    # Your hook logic here
    tool_name = data.get("tool_name", "")

    # To block: exit with non-zero and print reason
    if should_block:
        print(json.dumps({"decision": "block", "reason": "..."}))
        sys.exit(1)

    # To allow: exit 0
    sys.exit(0)

if __name__ == "__main__":
    main()
```

## Security Notes

- Essential hooks provide baseline security
- secret_scanner.py detects common credential patterns
- pre_tool_use.py blocks destructive operations
- Always review hooks before enabling in production

---

*A.E.S - Bizzy Hook System - Event-Driven Workflow Automation*
