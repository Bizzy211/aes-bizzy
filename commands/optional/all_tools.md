# Command: /all_tools

List all available tools and MCP servers in the current session.

## Description

Displays a comprehensive list of:
- Built-in Claude Code tools
- MCP server tools
- Available slash commands
- Configured hooks

## Steps

1. **List Built-in Tools**
   Display core Claude Code tools:
   ```
   Built-in Tools:
   - Read: Read file contents
   - Write: Create/overwrite files
   - Edit: Modify file contents
   - Bash: Execute shell commands
   - Glob: Find files by pattern
   - Grep: Search file contents
   - Task: Launch sub-agents
   - WebFetch: Fetch web content
   - WebSearch: Search the web
   ```

2. **List MCP Servers**
   Read `.mcp.json` to identify configured servers:
   ```bash
   cat .mcp.json
   ```

   Display server status and tools:
   ```
   MCP Servers:
   - task-master-ai: Task management (get_tasks, next_task, ...)
   - exa: Web search (web_search_exa, get_code_context_exa)
   - ref: Documentation (ref_search_documentation, ref_read_url)
   - elevenlabs: TTS (text_to_speech, play_audio)
   ```

3. **List Slash Commands**
   Scan `.claude/commands/` for available commands:
   ```bash
   find .claude/commands -name "*.md" -type f
   ```

   Display as:
   ```
   Slash Commands:
   - /prime: Load session context
   - /git_status: Git repository status
   - /question: Answer questions
   - /tm/*: Task Master commands
   ```

4. **List Active Hooks**
   Read `.claude/settings.json` for hook configuration:
   ```bash
   cat .claude/settings.json
   ```

   Display active hooks by event:
   ```
   Active Hooks:
   - PreToolUse: pre_tool_use.py, secret_scanner.py
   - PostToolUse: post_tool_use.py
   - Stop: stop.py
   ```

5. **Display Summary**
   ```
   📊 Tool Summary:
   - Built-in: 9 tools
   - MCP: 4 servers, 45+ tools
   - Commands: 6 slash commands
   - Hooks: 8 active hooks
   ```

## Beads Integration

Log tool usage queries to Beads:

```bash
bd update TASK_ID --add-note "Checked available tools: 45+ MCP tools available"
```

## Example Output

```
🛠️ Available Tools

Built-in Tools (9):
  Read, Write, Edit, Bash, Glob, Grep, Task, WebFetch, WebSearch

MCP Servers (4):

  task-master-ai:
    - get_tasks, next_task, get_task
    - set_task_status, expand_task, add_task
    - update_subtask, parse_prd, analyze_project_complexity

  exa:
    - web_search_exa: Real-time web search
    - get_code_context_exa: Code examples and docs

  ref:
    - ref_search_documentation: Search docs
    - ref_read_url: Read URL content

  elevenlabs:
    - text_to_speech: Generate audio
    - play_audio: Play audio files

Slash Commands (6):
  Essential:
    /prime - Load session context
    /git_status - Git repository status
    /question - Answer questions
  Optional:
    /all_tools - This command
    /prime_tts - Prime with TTS
    /update_status_line - Update status

Active Hooks (8):
  PreToolUse: pre_tool_use.py, secret_scanner.py
  PostToolUse: post_tool_use.py
  Stop: stop.py
  SubAgentStop: subagent_stop.py

📊 Summary: 9 built-in + 45 MCP tools + 6 commands
```

## Usage

```bash
/all_tools
```

## Related Commands

- `/prime` - Load full session context
- `/question` - Get tool-specific help

---

*A.E.S - Bizzy Command - Tool Inventory*
