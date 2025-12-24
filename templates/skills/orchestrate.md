---
name: orchestrate
description: Start pm-lead autonomous monitoring loop for continuous task execution
---

# Orchestrate Skill

Activate pm-lead's continuous orchestration mode for autonomous task execution.

## Overview

The `/orchestrate` skill resumes or starts pm-lead's monitoring loop, which:
1. Monitors Task Master for available tasks
2. Selects appropriate agents for each task
3. Delegates work with comprehensive context
4. Collects HandoffData and updates progress
5. Continues until all tasks are complete

## Usage

```
/orchestrate
```

## Prerequisites

Before using `/orchestrate`, ensure:

1. **Task Master is initialized**
   ```bash
   # Check for .taskmaster/tasks/tasks.json
   task-master list
   ```

2. **Tasks exist in the queue**
   ```bash
   # Should show pending tasks
   task-master next
   ```

3. **Git repository is initialized** (optional but recommended)

## Difference from /kickoff

| Aspect | /kickoff | /orchestrate |
|--------|----------|--------------|
| Creates PRD | Yes | No |
| Generates tasks | Yes | No |
| Assumes tasks exist | No | Yes |
| Research phase | Yes | No |
| Best for | New projects | Resuming work |

Use `/kickoff` for new projects, `/orchestrate` to continue existing projects.

## Workflow

### 1. Verify Task Master State

```javascript
// Check for pending tasks
const tasks = await mcp__task-master-ai__get_tasks({
  projectRoot: process.cwd(),
  status: 'pending'
});

if (tasks.length === 0) {
  console.log("No pending tasks. Use /kickoff to create tasks first.");
  return;
}
```

### 2. Load Task Queue

```javascript
// Get next available task (respects dependencies)
const nextTask = await mcp__task-master-ai__next_task({
  projectRoot: process.cwd()
});
```

### 3. Start pm-lead Monitoring Loop

```javascript
await Task({
  subagent_type: "pm-lead",
  description: "Start orchestration monitoring",
  prompt: `
    ORCHESTRATION MODE ACTIVE

    Begin autonomous task monitoring and delegation:

    1. Get next available task from Task Master
    2. Analyze task requirements
    3. Select appropriate specialized agent
    4. Prepare HandoffData context from previous tasks
    5. Spawn agent with Task tool
    6. Collect HandoffData from agent response
    7. Update task status in Task Master
    8. Repeat until no pending tasks remain

    Use mcp__task-master-ai tools for all task operations.
    Report progress after each task completion.
  `
});
```

## pm-lead Orchestration Loop

When orchestrating, pm-lead follows this algorithm:

```
while (pending tasks exist) {
  1. nextTask = mcp__task-master-ai__next_task()
  2. agent = selectAgent(nextTask)
  3. context = assembleContext(nextTask, previousHandoffs)
  4. result = Task({ agent, context })
  5. handoffData = extractHandoffData(result)
  6. mcp__task-master-ai__set_task_status(nextTask.id, 'done')
  7. mcp__task-master-ai__update_subtask(nextTask.id, handoffData)
}
```

## Monitoring Progress

While pm-lead orchestrates, you can:

```bash
# Check current task status
task-master list

# See which task is being worked on
task-master show <id>

# View complexity report
task-master complexity-report
```

## Interrupting Orchestration

To pause or stop orchestration:
- Use `/clear` to interrupt and start fresh
- pm-lead will complete the current agent task before stopping

To resume after interruption:
- Simply run `/orchestrate` again
- pm-lead will pick up from the next pending task

## Handling Failures

If an agent fails or gets blocked:

1. **pm-lead detects failure** via HandoffData status
2. **Task is marked blocked** in Task Master
3. **pm-lead attempts resolution**:
   - Retry with different context
   - Escalate to user after 3 attempts
   - Skip and continue with other tasks
4. **User can unblock** by updating task and re-running `/orchestrate`

## Example Session

```
> /orchestrate

pm-lead: Orchestration mode active. Found 8 pending tasks.

Analyzing Task 3.1: "Create database schema"
→ Delegating to db-architect

db-architect completed Task 3.1
→ HandoffData: 4 files created, 2 decisions logged

Analyzing Task 3.2: "Implement user authentication API"
→ Delegating to backend-dev

backend-dev completed Task 3.2
→ HandoffData: 5 files created, 3 decisions logged

... continues until all tasks complete ...

pm-lead: All tasks completed! Project ready for review.
```

---

*A.E.S - Bizzy Skill - Orchestration Control*
