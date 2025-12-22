# Command: /update_status_line

Update the Claude Code session status line with current context information.

## Description

Updates the terminal status line display with:
- Current task information
- Agent assignment
- Session progress
- Quick status indicators

## Steps

1. **Get Current Task from Beads**
   ```bash
   bd ready --json | head -1
   ```
   Extract current active task information.

2. **Get Task Master Status**
   ```bash
   task-master next --json
   ```
   Get next recommended task.

3. **Format Status Line**
   Create compact status string:
   ```
   [Agent: backend-dev] Task 49: Create commands (2/6 done) | 🟢 Ready
   ```

4. **Update Status Display**
   Use terminal escape codes or status API:
   ```python
   # Status line format
   status = f"[{agent}] {task_title} ({progress}) | {indicator}"
   ```

5. **Log Status Update**
   Record status change to Beads:
   ```bash
   bd update TASK_ID --add-note "Status updated: [summary]"
   ```

## Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 | Ready - No blockers |
| 🟡 | Working - In progress |
| 🔴 | Blocked - Waiting |
| ⚪ | Idle - No active task |

## Beads Integration

Pull status from Beads context:

```bash
# Get current task
CURRENT_TASK=$(bd ready --json | jq -r '.[0]')

# Get task details
TASK_TITLE=$(echo $CURRENT_TASK | jq -r '.title')
ASSIGNED_AGENT=$(echo $CURRENT_TASK | jq -r '.assignedAgent')
```

## Example Output

```
📊 Status Line Updated

Previous: [Idle] No active task
Current:  [backend-dev] Task 49: Create 6 commands (3/6) | 🟡 Working

Status details:
  Agent: backend-dev
  Task: 49 - Create 6 essential and optional commands
  Progress: 3 of 6 items complete
  State: Working (in-progress)
```

## Status Line Format

```
[AGENT] TASK_ID: TASK_TITLE (PROGRESS) | INDICATOR
```

Examples:
```
[pm-lead] Task 45: Create core agents (7/7) | 🟢 Complete
[debugger] Task 51: Fix auth bug (investigating) | 🟡 Working
[test-engineer] Task 52: Write tests (blocked) | 🔴 Blocked
[idle] No active task | ⚪ Ready
```

## Configuration

Status line can be customized:

```json
{
  "statusLine": {
    "showAgent": true,
    "showProgress": true,
    "showIndicator": true,
    "refreshInterval": 30
  }
}
```

## Auto-Update

Status line can auto-refresh:

```bash
# Watch for changes every 30 seconds
watch -n 30 /update_status_line
```

## Usage

```bash
/update_status_line
```

## Related Commands

- `/prime` - Full session context
- `/git_status` - Git repository status

---

*A.E.S - Bizzy Command - Status Line Management*
