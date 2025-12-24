# Beads & Task Master Integration Architecture

This document defines how Beads (context management) and Task Master (task lifecycle) work together in the A.E.S - Bizzy multi-agent orchestration system.

## Overview

The system uses two complementary data stores:

| System | Purpose | Storage | Lifetime |
|--------|---------|---------|----------|
| **Task Master** | Task lifecycle & current state | `.taskmaster/tasks/tasks.json` | Per-project, task-scoped |
| **Beads** | Long-term knowledge & context | `.beads/interactions.jsonl` | Per-project + global |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        A.E.S - BIZZY ORCHESTRATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PM-LEAD ORCHESTRATOR                         │   │
│  │                                                                       │   │
│  │   ┌───────────────┐              ┌───────────────┐                   │   │
│  │   │  Task Master  │              │     Beads     │                   │   │
│  │   │   (Current)   │              │  (Knowledge)  │                   │   │
│  │   └───────┬───────┘              └───────┬───────┘                   │   │
│  │           │                              │                           │   │
│  │           ▼                              ▼                           │   │
│  │   ┌───────────────┐              ┌───────────────┐                   │   │
│  │   │ "What to do"  │              │ "What we know"│                   │   │
│  │   │ Task status   │              │ Decisions     │                   │   │
│  │   │ Dependencies  │              │ Patterns      │                   │   │
│  │   │ HandoffData   │              │ Learnings     │                   │   │
│  │   └───────────────┘              └───────────────┘                   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        AGENT SPAWNING FLOW                           │   │
│  │                                                                       │   │
│  │   1. Get Task Details ─────────────► Task Master                     │   │
│  │   2. Prime Context ────────────────► Beads                           │   │
│  │   3. Spawn Agent with Combined Context                               │   │
│  │   4. Agent Executes Task                                             │   │
│  │   5. Store HandoffData ────────────► Task Master (update_subtask)    │   │
│  │   6. Store Decisions/Learnings ────► Beads (context add)             │   │
│  │   7. Update Status ────────────────► Task Master (set_status)        │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Decision Matrix: Beads vs Task Master

Use this matrix to determine where to store information:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHERE SHOULD THIS DATA GO?                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Is it about CURRENT task state?                                           │
│   (status, progress, files modified, next steps)                            │
│                    │                                                        │
│         ┌─────────┴─────────┐                                               │
│         │                   │                                               │
│        YES                  NO                                              │
│         │                   │                                               │
│         ▼                   ▼                                               │
│   ┌───────────┐     Is it REUSABLE knowledge?                               │
│   │   TASK    │     (decisions, patterns, learnings)                        │
│   │  MASTER   │              │                                              │
│   └───────────┘    ┌─────────┴─────────┐                                    │
│                    │                   │                                    │
│                   YES                  NO                                   │
│                    │                   │                                    │
│                    ▼                   ▼                                    │
│              ┌───────────┐      ┌───────────┐                               │
│              │   BEADS   │      │   TASK    │                               │
│              │ (context) │      │  MASTER   │                               │
│              └───────────┘      │ (subtask) │                               │
│                                 └───────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Specific Examples

| Information Type | Store In | Example | Reason |
|------------------|----------|---------|--------|
| Task completion status | Task Master | `set_task_status --id=3.2 --status=done` | Current state |
| Files modified in task | Task Master | HandoffData.filesModified in `update_subtask` | Task-specific |
| "Use Supabase RLS for auth" | Beads | `context add --type decision` | Reusable across tasks |
| "React Query better than Redux for this" | Beads | `context add --type decision` | Future agents need this |
| "Fixed CORS by adding headers" | Beads | `context add --type learning` | Others may hit same issue |
| "API endpoint returns X format" | Beads | `context add --type pattern` | Integration knowledge |
| Next steps for task | Task Master | HandoffData.recommendations | Task-specific |
| Blocker: waiting on API | Task Master | `set_task_status --status=blocked` | Current state |

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE ORCHESTRATION CYCLE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 1: TASK SELECTION                                               │  │
│  │                                                                        │  │
│  │   PM-Lead ──► mcp__task-master-ai__next_task()                        │  │
│  │            │                                                          │  │
│  │            └──► Returns: { id: "3.2", title: "Implement auth API" }   │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 2: CONTEXT ASSEMBLY                                             │  │
│  │                                                                        │  │
│  │   PM-Lead ──► mcp__task-master-ai__get_task({ id: "3.2" })           │  │
│  │            │  Returns: task details, subtask notes, HandoffData       │  │
│  │            │                                                          │  │
│  │            └──► aes-bizzy context prime --agent backend-dev --task 3.2│  │
│  │               Returns: relevant decisions, patterns, learnings        │  │
│  │                                                                        │  │
│  │   Combined Context = Task Details + Beads Context + HandoffData       │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 3: AGENT EXECUTION                                              │  │
│  │                                                                        │  │
│  │   PM-Lead ──► mcp__task-master-ai__set_task_status({                  │  │
│  │            │    id: "3.2", status: "in-progress"                       │  │
│  │            │  })                                                       │  │
│  │            │                                                          │  │
│  │            └──► Task({                                                │  │
│  │                   subagent_type: "backend-dev",                       │  │
│  │                   prompt: combinedContext + taskInstructions          │  │
│  │                 })                                                    │  │
│  │                                                                        │  │
│  │   Agent works... makes decisions... modifies files...                 │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 4: HANDOFF DATA CAPTURE                                         │  │
│  │                                                                        │  │
│  │   Agent Returns HandoffData:                                          │  │
│  │   {                                                                   │  │
│  │     taskId: "3.2",                                                    │  │
│  │     agent: "backend-dev",                                             │  │
│  │     status: "completed",                                              │  │
│  │     filesModified: ["src/auth/api.ts", "src/middleware/jwt.ts"],      │  │
│  │     decisions: [                                                      │  │
│  │       { decision: "Used RS256 for JWT", rationale: "..." }            │  │
│  │     ],                                                                │  │
│  │     recommendations: ["Add rate limiting", "Add refresh tokens"]      │  │
│  │   }                                                                   │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 5: DUAL STORAGE                                                 │  │
│  │                                                                        │  │
│  │   ┌─────────────────────────────┐   ┌─────────────────────────────┐   │  │
│  │   │       TASK MASTER           │   │          BEADS              │   │  │
│  │   │                             │   │                             │   │  │
│  │   │  mcp__task-master-ai__      │   │  aes-bizzy context add      │   │  │
│  │   │  update_subtask({           │   │    "Used RS256 for JWT"     │   │  │
│  │   │    id: "3.2",               │   │    --type decision          │   │  │
│  │   │    prompt: HandoffData      │   │    --agent backend-dev      │   │  │
│  │   │  })                         │   │    --task 3.2               │   │  │
│  │   │                             │   │                             │   │  │
│  │   │  Stores: Full HandoffData   │   │  Stores: Reusable decision  │   │  │
│  │   │  (files, status, next)      │   │  (for future agents)        │   │  │
│  │   │                             │   │                             │   │  │
│  │   └─────────────────────────────┘   └─────────────────────────────┘   │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ PHASE 6: STATUS UPDATE                                                │  │
│  │                                                                        │  │
│  │   PM-Lead ──► mcp__task-master-ai__set_task_status({                  │  │
│  │                 id: "3.2", status: "done"                              │  │
│  │               })                                                       │  │
│  │                                                                        │  │
│  │            ──► Loop back to PHASE 1 for next task                     │  │
│  │                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Command Reference

### Task Master Commands (Current State)

```bash
# Task Discovery
task-master list                              # All tasks
task-master next                              # Next available (dependency-aware)
task-master show <id>                         # Task details with subtasks

# Status Management
task-master set-status --id=<id> --status=pending|in-progress|done|blocked|review

# HandoffData Storage
task-master update-subtask --id=<id> --prompt='{"agent":"...", "filesModified":[...]}'

# Task Creation
task-master add-task --prompt="description"
task-master expand --id=<id> --research
```

### Beads Commands (Knowledge Storage)

```bash
# Store Knowledge
aes-bizzy context add "Decision or learning" --type decision|learning|pattern --agent <agent> --task <id>

# Retrieve Context
aes-bizzy context prime --agent <agent> --task <id> --format prompt
aes-bizzy context search "query" --type decision --agent <agent>
aes-bizzy context list --type pattern

# Sync HandoffData → Beads (extracts decisions/learnings)
aes-bizzy context sync --task-id <id>
```

## Integration Points

### Pre-Task Hook (Before Spawning Agent)

```typescript
async function prepareAgentContext(taskId: string, agentType: string) {
  // 1. Get task details from Task Master
  const task = await mcp__task-master-ai__get_task({
    id: taskId,
    projectRoot: process.cwd()
  });

  // 2. Get previous HandoffData from subtask notes
  const previousHandoffs = task.subtasks
    ?.filter(s => s.notes)
    .map(s => JSON.parse(s.notes));

  // 3. Prime context from Beads
  const beadsContext = await exec(
    `aes-bizzy context prime --agent ${agentType} --task ${taskId} --format prompt`
  );

  // 4. Combine all context
  return {
    task: task,
    previousHandoffs: previousHandoffs,
    projectKnowledge: beadsContext,
    combinedPrompt: `
## Task Details
${task.description}

## Previous Work on This Task
${JSON.stringify(previousHandoffs, null, 2)}

## Project Knowledge (Decisions & Patterns)
${beadsContext}

## Your Assignment
${task.details}
    `
  };
}
```

### Post-Task Hook (After Agent Completes)

```typescript
async function processAgentHandoff(taskId: string, handoffData: HandoffData) {
  // 1. Store full HandoffData in Task Master
  await mcp__task-master-ai__update_subtask({
    id: taskId,
    prompt: JSON.stringify(handoffData, null, 2),
    projectRoot: process.cwd()
  });

  // 2. Extract and store decisions in Beads
  for (const decision of handoffData.decisions || []) {
    await exec(`aes-bizzy context add "${decision.description}" \
      --type decision \
      --agent ${handoffData.agent} \
      --task ${taskId} \
      --tags ${decision.tags?.join(',') || ''}`);
  }

  // 3. Store any learnings in Beads
  for (const learning of handoffData.learnings || []) {
    await exec(`aes-bizzy context add "${learning}" \
      --type learning \
      --agent ${handoffData.agent} \
      --task ${taskId}`);
  }

  // 4. Update task status
  await mcp__task-master-ai__set_task_status({
    id: taskId,
    status: handoffData.status === 'completed' ? 'done' : 'blocked',
    projectRoot: process.cwd()
  });
}
```

## Context Lifetime Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTEXT LIFETIME                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   TASK MASTER                          BEADS                                │
│   ───────────                          ─────                                │
│                                                                             │
│   Task Created ─┐                      ┌─ Project Start                     │
│                 │                      │                                    │
│   In Progress ──┤  Task Lifetime       │                                    │
│                 │  (days/weeks)        │  Project Lifetime                  │
│   Completed ────┘                      │  (months/years)                    │
│                                        │                                    │
│   HandoffData archived                 │  Decisions persist                 │
│   (still queryable)                    │  Patterns accumulate               │
│                                        │  Learnings compound                │
│                                        │                                    │
│                                        └─ Project End (or never)            │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│   GLOBAL BEADS (~/.beads/)                                                  │
│   ────────────────────────                                                  │
│                                                                             │
│   ┌─ Developer Career ──────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │  "Always use TypeScript strict mode"                                │   │
│   │  "Prefer composition over inheritance"                              │   │
│   │  "This library has bug X, workaround is Y"                          │   │
│   │                                                                      │   │
│   └─ Persists across ALL projects ──────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Best Practices

### DO Store in Task Master

- Task completion status
- Files modified/created (HandoffData)
- Blockers and dependencies
- Next steps for THIS task
- Test results and coverage
- PR numbers and branch names

### DO Store in Beads

- Architectural decisions with rationale
- Technology choices ("Used X because Y")
- Code patterns established
- Integration quirks discovered
- Performance optimizations found
- Security considerations noted

### DON'T

- Don't duplicate: If it's in HandoffData, don't also add to Beads unless it's a reusable decision
- Don't store temporary info in Beads (debug logs, WIP notes)
- Don't store task-specific details in Beads (file lists, status)
- Don't skip Beads for important decisions just because they're in HandoffData

## Sync Workflow

Beads can sync from Task Master to extract decisions:

```bash
# After task completion, sync extracts decisions from HandoffData
aes-bizzy context sync --task-id 3.2

# This parses HandoffData from update_subtask and creates Beads entries
# for any decisions[] or learnings[] found
```

## Summary

| Question | Answer |
|----------|--------|
| Where is current task state? | Task Master |
| Where are reusable decisions? | Beads |
| Where is HandoffData stored? | Task Master (subtask notes) |
| Where do agents get context? | Both (Task Master + Beads prime) |
| What persists after task done? | Both, but Beads is primary for knowledge |
| What's queryable by future tasks? | Both, but Beads has semantic search |

---

*A.E.S - Bizzy Multi-Agent System - Dual Context Architecture*
