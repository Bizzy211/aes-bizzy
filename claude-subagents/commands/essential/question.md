# Command: /question

Answer questions about the project structure and documentation without coding. Uses Beads context for informed responses.

## Description

Answer user questions about:
- Project architecture and structure
- Documentation and README content
- Available agents and their capabilities
- Task status and progress
- Codebase patterns and conventions

This command focuses on information retrieval without making code changes.

## Steps

1. **Load Beads Project Context**
   ```bash
   bd get project-context --json
   ```
   Get stored project context for informed answers.

2. **Check Task Context**
   ```bash
   bd ready --json
   ```
   Understand current task state for relevant answers.

3. **Read Relevant Documentation**
   Based on the question, read appropriate files:
   - `README.md` - Project overview
   - `CLAUDE.md` - Agent instructions
   - `docs/` - Additional documentation
   - `claude-subagents/manifests/agent-index.json` - Agent capabilities

4. **Search Codebase if Needed**
   Use Grep to find relevant code patterns:
   ```bash
   # Find related files
   Grep pattern="keyword" output_mode="files_with_matches"
   ```

5. **Formulate Answer**
   Provide clear, concise answer with:
   - Direct answer to the question
   - Relevant file references
   - Links to related documentation
   - Suggestions for further exploration

6. **Do NOT Write Code**
   This command is for information only:
   - No file modifications
   - No code generation
   - No implementation suggestions

   If user needs code, suggest using appropriate agent.

## Beads Integration

Use Beads context to provide informed answers:

```bash
# Get project context
bd get project-context

# Check if question relates to active task
bd ready --json

# Log question for context tracking
bd update TASK_ID --add-note "Answered question about: [topic]"
```

## Example Interactions

### Project Structure Question

**User:** What agents are available?

**Response:**
```
The A.E.S - Bizzy ecosystem includes 10+1 agents:

Core Agents (3):
- pm-lead: Project management and task creation
- agent-router: Routes tasks to appropriate specialists
- agent-creator: Generates new specialized agents

Specialist Agents (7):
- backend-dev: Server-side development
- frontend-dev: UI/UX implementation
- debugger: Bug investigation
- test-engineer: Testing strategies
- docs-engineer: Documentation
- devops-engineer: CI/CD and deployment
- security-expert: Security analysis

See: claude-subagents/manifests/agent-index.json for full details.
```

### Task Status Question

**User:** What tasks are pending?

**Response:**
```
Current pending tasks from Beads:

1. Task 49: Create 6 essential commands
   Assigned: meta-agent
   Priority: low

2. Task 50: Implement agent router
   Assigned: pm-lead
   Priority: medium

Use /task-master list for full task details.
```

### Architecture Question

**User:** How does the hook system work?

**Response:**
```
The hook system uses event-driven Python scripts:

Events:
- PreToolUse: Before tool execution (validation/blocking)
- PostToolUse: After tool completion (logging)
- Stop: Session end (Beads sync)

Hook Categories:
- essential/ (8): Always enabled for security/context
- recommended/ (13): Project-based validation
- optional/ (5): Utility and logging

See: claude-subagents/hooks/README.md for configuration.
```

## Usage

```bash
/question "What is the project structure?"
/question "How do agents communicate?"
/question "What hooks are available?"
```

## Related Commands

- `/prime` - Load full session context
- `/all_tools` - List available tools

---

*A.E.S - Bizzy Command - Information Retrieval*
