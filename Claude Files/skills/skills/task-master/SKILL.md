# Task Master AI Skill

> Advanced project management with PRD parsing, complexity analysis, and TDD workflows

---

## When to Use This Skill

Use this skill when:
- Parsing PRD documents into actionable tasks
- Analyzing task complexity for estimation
- Using TDD autopilot workflow
- Managing tasks with tags and dependencies
- Expanding tasks into subtasks
- Getting the next recommended task

---

## MCP Server Setup

```bash
# Add Task Master AI MCP
claude mcp add task-master-ai -s user -- npx -y task-master-ai

# Configure model (optional)
task-master-ai:models --setMain claude-sonnet-4
```

---

## Quick Reference

### Essential Commands

```javascript
// Get all tasks
task-master-ai:get_tasks({ projectRoot: "/path/to/project" })

// Get next task to work on
task-master-ai:next_task({ projectRoot: "/path/to/project" })

// Set task status
task-master-ai:set_task_status({ 
  projectRoot: "/path/to/project",
  id: "1",
  status: "in-progress"
})

// Parse PRD into tasks
task-master-ai:parse_prd({
  projectRoot: "/path/to/project",
  input: ".taskmaster/docs/prd.txt",
  force: true
})
```

### Task Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in-progress` | Being worked on |
| `done` | Completed |
| `blocked` | Waiting on dependency |
| `deferred` | Postponed |
| `cancelled` | Won't do |
| `review` | Needs review |

---

## Project Initialization

### Initialize New Project

```javascript
task-master-ai:initialize_project({
  projectRoot: "/path/to/project",
  yes: true,
  skipInstall: false,
  initGit: true,
  storeTasksInGit: true,
  addAliases: true,
  rules: ["claude", "cursor"]  // IDE rule profiles
})
```

This creates:
```
.taskmaster/
├── tasks/
│   └── tasks.json
├── docs/
│   └── prd.txt (empty)
├── reports/
└── .taskmasterconfig
```

### Set Models

```javascript
// View current config
task-master-ai:models({ projectRoot: "/path/to/project" })

// Set main model
task-master-ai:models({
  projectRoot: "/path/to/project",
  setMain: "claude-sonnet-4"
})

// Set research model (for research-enabled operations)
task-master-ai:models({
  projectRoot: "/path/to/project",
  setResearch: "claude-opus-4"
})
```

---

## PRD Parsing

### Create PRD Document

```
# .taskmaster/docs/prd.txt

# Project Name - PRD

## Overview
Brief description of what we're building.

## Goals
1. Primary goal
2. Secondary goal
3. Tertiary goal

## Features

### Feature 1: Authentication
Description of authentication feature.
- Sub-requirement 1
- Sub-requirement 2

### Feature 2: Dashboard
Description of dashboard feature.
- Sub-requirement 1
- Sub-requirement 2

## Technical Requirements
- Performance requirements
- Security requirements
- Scalability requirements

## Timeline
- Phase 1: 4 weeks
- Phase 2: 2 weeks
```

### Parse PRD

```javascript
task-master-ai:parse_prd({
  projectRoot: "/path/to/project",
  input: ".taskmaster/docs/prd.txt",
  numTasks: "10",    // Approximate number of tasks to generate
  force: true,       // Overwrite existing tasks
  research: false    // Use research model
})
```

**Output**: Creates tasks in `.taskmaster/tasks/tasks.json`

---

## Task Management

### View Tasks

```javascript
// All tasks
task-master-ai:get_tasks({ projectRoot: "/path/to/project" })

// With subtasks
task-master-ai:get_tasks({ 
  projectRoot: "/path/to/project",
  withSubtasks: true
})

// Filter by status
task-master-ai:get_tasks({ 
  projectRoot: "/path/to/project",
  status: "pending"
})

// Multiple statuses
task-master-ai:get_tasks({ 
  projectRoot: "/path/to/project",
  status: "pending,in-progress"
})
```

### Get Specific Task

```javascript
task-master-ai:get_task({
  projectRoot: "/path/to/project",
  id: "1"
})

// Multiple tasks
task-master-ai:get_task({
  projectRoot: "/path/to/project",
  id: "1,2,3"
})
```

### Add New Task

```javascript
// AI-generated task
task-master-ai:add_task({
  projectRoot: "/path/to/project",
  prompt: "Add user profile editing functionality with avatar upload",
  priority: "high",
  dependencies: "1,3"  // Depends on tasks 1 and 3
})

// Manual task
task-master-ai:add_task({
  projectRoot: "/path/to/project",
  title: "Implement avatar upload",
  description: "Allow users to upload profile pictures",
  details: "Use S3 for storage, max 5MB, image validation",
  priority: "medium",
  dependencies: "5"
})
```

### Update Task Status

```javascript
task-master-ai:set_task_status({
  projectRoot: "/path/to/project",
  id: "1",
  status: "done"
})

// Multiple tasks
task-master-ai:set_task_status({
  projectRoot: "/path/to/project",
  id: "1,2,3",
  status: "done"
})

// Subtask
task-master-ai:set_task_status({
  projectRoot: "/path/to/project",
  id: "1.2",  // Subtask 2 of task 1
  status: "in-progress"
})
```

### Update Task Content

```javascript
// Update task with new context
task-master-ai:update_task({
  projectRoot: "/path/to/project",
  id: "1",
  prompt: "Requirements changed: now need to support OAuth only, no email/password"
})

// Append information
task-master-ai:update_task({
  projectRoot: "/path/to/project",
  id: "1",
  prompt: "API endpoint confirmed: POST /api/auth/login",
  append: true
})
```

### Update Subtask

```javascript
task-master-ai:update_subtask({
  projectRoot: "/path/to/project",
  id: "1.2",  // Parent.Subtask
  prompt: "Updated implementation approach: use React Query"
})
```

---

## Complexity Analysis

### Analyze All Tasks

```javascript
task-master-ai:analyze_project_complexity({
  projectRoot: "/path/to/project",
  threshold: 5,     // Recommend expansion for complexity >= 5
  research: false   // Use research model for better analysis
})
```

**Output**: Creates `.taskmaster/reports/task-complexity-report.json`

### View Complexity Report

```javascript
task-master-ai:complexity_report({
  projectRoot: "/path/to/project"
})
```

### Analyze Specific Tasks

```javascript
// By IDs
task-master-ai:analyze_project_complexity({
  projectRoot: "/path/to/project",
  ids: "1,3,5",
  threshold: 5
})

// By range
task-master-ai:analyze_project_complexity({
  projectRoot: "/path/to/project",
  from: 5,
  to: 10
})
```

---

## Task Expansion

### Expand Single Task

```javascript
task-master-ai:expand_task({
  projectRoot: "/path/to/project",
  id: "1",
  num: "5",           // Number of subtasks to generate
  force: false,       // Don't overwrite existing subtasks
  research: false,
  prompt: "Focus on security aspects"
})
```

### Expand All Tasks

```javascript
task-master-ai:expand_all({
  projectRoot: "/path/to/project",
  force: false,
  research: false,
  prompt: "Include testing considerations for each subtask"
})
```

### Clear Subtasks

```javascript
// Clear specific task's subtasks
task-master-ai:clear_subtasks({
  projectRoot: "/path/to/project",
  id: "1,2,3"
})

// Clear all subtasks
task-master-ai:clear_subtasks({
  projectRoot: "/path/to/project",
  all: true
})
```

---

## TDD Autopilot Workflow

Task Master's autopilot guides you through Test-Driven Development:

```
RED → GREEN → COMMIT
 ↑        ↓
 └────────┘
```

### Start Autopilot

```javascript
task-master-ai:autopilot_start({
  projectRoot: "/path/to/project",
  taskId: "1",        // Main task ID (not subtask)
  maxAttempts: 3,     // Max attempts per subtask
  force: false
})
```

### Get Next Action

```javascript
task-master-ai:autopilot_next({
  projectRoot: "/path/to/project"
})
```

Returns what to do next (write test, implement, commit).

### Check Status

```javascript
task-master-ai:autopilot_status({
  projectRoot: "/path/to/project"
})
```

### Complete Phase

After running tests:

```javascript
// RED phase: expecting failures
task-master-ai:autopilot_complete_phase({
  projectRoot: "/path/to/project",
  testResults: {
    total: 5,
    passed: 0,
    failed: 5,
    skipped: 0
  }
})

// GREEN phase: expecting all pass
task-master-ai:autopilot_complete_phase({
  projectRoot: "/path/to/project",
  testResults: {
    total: 5,
    passed: 5,
    failed: 0,
    skipped: 0
  }
})
```

### Commit

```javascript
task-master-ai:autopilot_commit({
  projectRoot: "/path/to/project",
  customMessage: "feat(auth): implement login endpoint"  // Optional
})
```

### Finalize Workflow

```javascript
task-master-ai:autopilot_finalize({
  projectRoot: "/path/to/project"
})
```

### Abort Workflow

```javascript
task-master-ai:autopilot_abort({
  projectRoot: "/path/to/project"
})
```

### Resume Workflow

```javascript
task-master-ai:autopilot_resume({
  projectRoot: "/path/to/project"
})
```

---

## Tags (Branching)

Tags allow parallel work streams:

### List Tags

```javascript
task-master-ai:list_tags({
  projectRoot: "/path/to/project",
  showMetadata: true
})
```

### Create Tag

```javascript
task-master-ai:add_tag({
  projectRoot: "/path/to/project",
  name: "feature-auth",
  description: "Authentication feature development",
  copyFromCurrent: true  // Copy current tasks to new tag
})

// From git branch
task-master-ai:add_tag({
  projectRoot: "/path/to/project",
  fromBranch: true  // Uses current git branch name
})
```

### Switch Tag

```javascript
task-master-ai:use_tag({
  projectRoot: "/path/to/project",
  name: "feature-auth"
})
```

### Delete Tag

```javascript
task-master-ai:delete_tag({
  projectRoot: "/path/to/project",
  name: "feature-auth",
  yes: true
})
```

---

## Dependencies

### Add Dependency

```javascript
task-master-ai:add_dependency({
  projectRoot: "/path/to/project",
  id: "5",           // Task that will depend
  dependsOn: "3"     // Task it depends on
})
```

### Remove Dependency

```javascript
task-master-ai:remove_dependency({
  projectRoot: "/path/to/project",
  id: "5",
  dependsOn: "3"
})
```

### Validate Dependencies

```javascript
task-master-ai:validate_dependencies({
  projectRoot: "/path/to/project"
})
```

### Fix Dependencies

```javascript
task-master-ai:fix_dependencies({
  projectRoot: "/path/to/project"
})
```

---

## Scoping Tasks

### Scope Up (Increase Complexity)

```javascript
task-master-ai:scope_up_task({
  projectRoot: "/path/to/project",
  id: "1",
  strength: "regular",  // light, regular, heavy
  prompt: "Add error handling and logging requirements"
})
```

### Scope Down (Decrease Complexity)

```javascript
task-master-ai:scope_down_task({
  projectRoot: "/path/to/project",
  id: "1",
  strength: "regular",
  prompt: "Focus only on MVP requirements"
})
```

---

## Research Integration

Use the research model for deeper analysis:

```javascript
// Research a topic
task-master-ai:research({
  projectRoot: "/path/to/project",
  query: "Best practices for implementing OAuth 2.0 with refresh tokens",
  detailLevel: "high",  // low, medium, high
  saveToFile: true,
  saveTo: "1"  // Optionally save to task
})
```

---

## Workflow Example

### Complete Project Setup

```javascript
// 1. Initialize project
task-master-ai:initialize_project({
  projectRoot: "/path/to/project",
  yes: true,
  initGit: true,
  storeTasksInGit: true
})

// 2. Set models
task-master-ai:models({
  projectRoot: "/path/to/project",
  setMain: "claude-sonnet-4"
})

// 3. Parse PRD
task-master-ai:parse_prd({
  projectRoot: "/path/to/project",
  input: ".taskmaster/docs/prd.txt",
  force: true
})

// 4. Analyze complexity
task-master-ai:analyze_project_complexity({
  projectRoot: "/path/to/project",
  threshold: 5
})

// 5. Expand complex tasks
task-master-ai:expand_all({
  projectRoot: "/path/to/project"
})

// 6. Get first task
task-master-ai:next_task({
  projectRoot: "/path/to/project"
})

// 7. Start working with TDD
task-master-ai:autopilot_start({
  projectRoot: "/path/to/project",
  taskId: "1"
})
```

---

## Integration with Beads

Task Master and Beads serve different purposes:

| Task Master | Beads |
|-------------|-------|
| PRD → Tasks | Daily task tracking |
| Complexity analysis | Agent handoffs |
| TDD workflow | Context notes |
| Task generation | Dependency graph |

### Sync Pattern

```bash
# Task Master for planning
task-master-ai:parse_prd(...)
task-master-ai:expand_all(...)

# Create corresponding Beads epic
bd create "Epic: [Project Name]" -t feature -p 1 --json

# For each Task Master task, create Beads issue
bd create "[Task title from TM]" --deps parent:bd-epic-id --json

# Work in Beads for daily tracking
bd update bd-xxxx --status in_progress
bd close bd-xxxx --reason "Completed per TM task 1"
bd sync
```

---

## Troubleshooting

### "Project not found"
```javascript
// Always use absolute path
task-master-ai:get_tasks({
  projectRoot: "C:/Users/Bizzy/projects/my-project"  // Not relative
})
```

### Tasks not saving
```bash
# Check .taskmaster directory exists
ls .taskmaster/tasks/

# Reinitialize if needed
task-master-ai:initialize_project({ force: true, ... })
```

### Autopilot stuck
```javascript
// Check status
task-master-ai:autopilot_status({ projectRoot: "..." })

// Abort and restart
task-master-ai:autopilot_abort({ projectRoot: "..." })
task-master-ai:autopilot_start({ projectRoot: "...", taskId: "1", force: true })
```

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
