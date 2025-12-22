# Command: /prime

Load context for a new agent session by analyzing codebase structure, documentation, and README. Initializes Beads context and displays available agents.

## Description

Prime prepares Claude for a new working session by:
- Loading Beads task context
- Reading project structure
- Loading agent capabilities from agent-index.json
- Summarizing available agents and tools

## Steps

1. **Check Beads Status**
   ```bash
   bd status --json
   ```
   Display current task count and session state.

2. **Load Ready Tasks**
   ```bash
   bd ready --json
   ```
   Show tasks ready for work with their assigned agents.

3. **Read Project README**
   Use the Read tool to read `README.md` if it exists.
   Summarize project purpose and structure.

4. **Read CLAUDE.md**
   Use the Read tool to read `CLAUDE.md` if it exists.
   Note any project-specific instructions.

5. **Load Agent Index**
   Use the Read tool to read `claude-subagents/manifests/agent-index.json`.
   Parse and display available agents:

   **Core Agents:**
   - List orchestrator, router, meta-agent

   **Specialist Agents:**
   - List all specialist agents with brief descriptions

6. **Analyze Codebase Structure**
   Use Glob to identify key directories:
   ```
   src/, lib/, components/, pages/, api/, tests/
   ```

7. **Display Session Summary**
   Output:
   - Project name and purpose
   - Key directories
   - Available agents (with capabilities)
   - Ready tasks from Beads
   - Recommended starting point

## Beads Integration

This command uses Beads to:
- Check session status with `bd status`
- Load ready tasks with `bd ready`
- Identify stale tasks with `bd stale`

## Example Output

```
📋 Session Primed

Project: A.E.S - Bizzy Multi-Agent System
Purpose: Claude Code orchestration with specialized agents

📁 Structure:
  - claude-subagents/agents/ (10 agents)
  - claude-subagents/hooks/ (26 hooks)
  - claude-subagents/skills/ (9 skills)

🤖 Available Agents:
  Core: pm-lead, agent-router, agent-creator
  Specialists: backend-dev, frontend-dev, debugger...

📌 Ready Tasks (3):
  - Task 49: Create 6 essential commands (assigned: meta-agent)
  - Task 50: Implement agent router (assigned: pm-lead)

💡 Recommended: Start with Task 49 (/task-master show 49)
```

## Usage

```bash
/prime
```

---

*A.E.S - Bizzy Command - Session Initialization*
