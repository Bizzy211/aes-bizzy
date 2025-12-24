---
name: handoff
description: Report task completion with structured HandoffData format to pm-lead
---

# Handoff Command

Report task completion to pm-lead with structured handoff data.

## Usage

```
/handoff <taskId> <agent> [options]
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `taskId` | Yes | Task Master task ID (e.g., "15" or "15.2") |
| `agent` | Yes | Current agent identifier (e.g., "frontend-dev") |
| `--files` | No | Comma-separated list of modified files |
| `--decisions` | No | JSON string of decisions made |
| `--next-agent` | No | Suggested agent for next handoff |
| `--status` | No | Completion status (default: "completed") |

### Examples

**Basic handoff:**
```
/handoff 15.2 frontend-dev
```

**With files and next agent:**
```
/handoff 15.2 frontend-dev --files src/Login.tsx,src/types.ts --next-agent test-engineer
```

**Full handoff with decisions:**
```
/handoff 15.2 frontend-dev --files src/Login.tsx,src/hooks/useAuth.ts --decisions "[{\"description\":\"Used React Query\",\"rationale\":\"Better caching\"}]" --next-agent test-engineer
```

**Reporting a blocked task:**
```
/handoff 15.2 frontend-dev --status blocked --decisions "[{\"description\":\"Waiting for API\",\"rationale\":\"Backend not ready\"}]"
```

## Implementation

When this command is invoked:

### 1. Construct HandoffData Object

```typescript
const handoffData: HandoffData = {
  taskId: args.taskId,
  taskTitle: await getTaskTitle(args.taskId),
  agent: args.agent,
  status: args.status || 'completed',
  completedAt: new Date().toISOString(),
  summary: generateSummary(),  // From conversation context
  filesModified: parseFiles(args.files),
  filesCreated: [],
  decisions: parseDecisions(args.decisions),
  recommendations: [],
  contextForNext: {
    keyPatterns: [],
    integrationPoints: []
  }
};
```

### 2. Log to Task Master

```javascript
// Update subtask with HandoffData
mcp__task-master-ai__update_subtask({
  id: args.taskId,
  prompt: JSON.stringify(handoffData, null, 2),
  projectRoot: process.cwd()
});
```

### 3. Update Task Status

```javascript
// Mark task complete (or blocked if status is blocked)
mcp__task-master-ai__set_task_status({
  id: args.taskId,
  status: args.status === 'blocked' ? 'blocked' : 'done',
  projectRoot: process.cwd()
});
```

### 4. Notify pm-lead

The HandoffData is now available for pm-lead to:
- Retrieve context for next agent
- Track decisions and files modified
- Determine next steps based on recommendations

## Status Values

| Status | Description | Next Action |
|--------|-------------|-------------|
| `completed` | Task finished successfully | pm-lead assigns next task |
| `blocked` | Task cannot continue | pm-lead investigates or escalates |
| `needs-review` | Work done, review needed | pm-lead spawns code-reviewer |
| `failed` | Task failed to complete | pm-lead attempts retry or escalates |

## Best Practices

### Always Include

1. **All modified files** - Even small changes matter
2. **Key decisions** - Document why, not just what
3. **Next agent suggestion** - If you know who should continue

### File Path Format

Use relative paths from project root:
```
--files src/components/Login.tsx,src/hooks/useAuth.ts,package.json
```

### Decision Format

JSON array of decision objects:
```json
[
  {
    "description": "What was decided",
    "rationale": "Why this choice",
    "alternatives": ["Option 1", "Option 2"]
  }
]
```

## Interactive Mode

If called without parameters, prompt for:

1. Task ID (from recent tasks)
2. Files modified (from git status)
3. Summary of work done
4. Key decisions made
5. Suggested next agent

## Example Workflow

```
Agent: I've completed the login form implementation.

> /handoff 15.2 frontend-dev --files src/components/forms/LoginForm.tsx,src/hooks/useLogin.ts --decisions "[{\"description\":\"Used react-hook-form for form state\",\"rationale\":\"Better performance and validation\"}]" --next-agent test-engineer

HandoffData logged to Task Master:
{
  "taskId": "15.2",
  "agent": "frontend-dev",
  "status": "completed",
  "filesModified": [
    "src/components/forms/LoginForm.tsx",
    "src/hooks/useLogin.ts"
  ],
  "decisions": [
    {
      "description": "Used react-hook-form for form state",
      "rationale": "Better performance and validation"
    }
  ]
}

Task 15.2 marked as done.
Next agent suggested: test-engineer
```

---

*A.E.S - Bizzy Command - Task Handoff Protocol*
